/**
 * Pengaturan — Admin settings:
 *  - Profil Admin
 *  - Info RT 05
 *  - Iuran Settings (nominal default → Firestore settings/iuran_default)
 *  - Keamanan Kata Sandi
 *  - Notifikasi
 */
import { useState, useEffect } from "react";
import { User, Home, Bell, Lock, ChevronRight, Save, Eye, EyeOff, Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { doc, updateDoc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db, auth } from "../../../firebase";
import { getSession, updateSession } from "../../../auth";
import { rtInfo, COLL, SETTINGS_DOC, type SettingsDoc } from "./data";
import { showToast } from "./ui";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const tabs = [
  { id: "profil",     label: "Profil",      icon: User       },
  { id: "rt",         label: "Info RT",     icon: Home       },
  { id: "iuran",      label: "Pengaturan Iuran", icon: CreditCard },
  { id: "keamanan",   label: "Keamanan",    icon: Lock       },
  { id: "notifikasi", label: "Notifikasi",  icon: Bell       },
];

export function Pengaturan() {
  const session = getSession();
  const [activeTab,     setActiveTab]     = useState("profil");
  const [showOldPass,   setShowOldPass]   = useState(false);
  const [showNewPass,   setShowNewPass]   = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [profileForm,   setProfileForm]   = useState({
    name:    session?.name    ?? "",
    phone:   session?.phone   ?? "",
    address: session?.address ?? "",
  });
  const [passForm, setPassForm] = useState({ current: "", newPass: "", confirm: "" });
  const [notifSettings, setNotifSettings] = useState({
    iuran: true, surat: true, pengumuman: true, janji: false, laporan: true,
  });

  // ── Iuran Settings state ──────────────────────────────────────────────────
  const [iuranSettings, setIuranSettings] = useState<SettingsDoc>({
    nominalBulanan:     25000,
    allowCustomNominal: true,
  });
  const [loadingIuran, setLoadingIuran] = useState(true);
  const [savedIuran,   setSavedIuran]   = useState(false);

  // Fetch from Firestore in real-time
  useEffect(() => {
    const ref = doc(db, COLL.settings, SETTINGS_DOC.iuranDefault);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data() as SettingsDoc;
        setIuranSettings({
          nominalBulanan:     d.nominalBulanan     ?? 25000,
          allowCustomNominal: d.allowCustomNominal ?? true,
        });
      }
      setLoadingIuran(false);
    }, () => setLoadingIuran(false));
    return () => unsub();
  }, []);

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, COLL.users, session.uid), {
        name:    profileForm.name,
        phone:   profileForm.phone,
        address: profileForm.address,
      });
      updateSession(profileForm);
      showToast("Profil berhasil diperbarui", "success");
    } catch {
      showToast("Gagal menyimpan profil.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Save iuran settings ───────────────────────────────────────────────────
  const handleSaveIuran = async () => {
    if (!iuranSettings.nominalBulanan || iuranSettings.nominalBulanan <= 0) {
      showToast("Nominal iuran harus lebih dari 0", "error");
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, COLL.settings, SETTINGS_DOC.iuranDefault),
        {
          nominalBulanan:     iuranSettings.nominalBulanan,
          allowCustomNominal: iuranSettings.allowCustomNominal,
          updatedAt:          serverTimestamp(),
          updatedBy:          session?.name ?? "Admin",
        },
        { merge: true },
      );
      showToast(`Nominal default iuran diperbarui: ${fmt(iuranSettings.nominalBulanan)}`, "success");
      setSavedIuran(true);
      setTimeout(() => setSavedIuran(false), 3000);
    } catch {
      showToast("Gagal menyimpan pengaturan iuran.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!passForm.current || !passForm.newPass) {
      showToast("Semua field wajib diisi", "error"); return;
    }
    if (passForm.newPass !== passForm.confirm) {
      showToast("Konfirmasi kata sandi tidak cocok", "error"); return;
    }
    if (passForm.newPass.length < 6) {
      showToast("Kata sandi minimal 6 karakter", "error"); return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("Not authenticated");
      const cred = EmailAuthProvider.credential(user.email, passForm.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, passForm.newPass);
      setPassForm({ current: "", newPass: "", confirm: "" });
      showToast("Kata sandi berhasil diubah", "success");
    } catch (err: any) {
      if (err?.code === "auth/wrong-password") showToast("Kata sandi lama tidak benar", "error");
      else showToast("Gagal mengubah kata sandi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const initials = (session?.name ?? "A").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Pengaturan</h1>
        <p className="text-sm text-slate-400 mt-0.5">Kelola profil dan konfigurasi sistem RT 05</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors border-b border-slate-50 last:border-0 ${
                    activeTab === tab.id ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{tab.label}</span>
                  <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${activeTab === tab.id ? "rotate-90" : ""}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* ─ Profil ─ */}
          {activeTab === "profil" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Informasi Profil</h2>
                <p className="text-sm text-slate-400 mt-0.5">Perbarui informasi pribadi Anda</p>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">{initials}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{session?.name ?? "—"}</p>
                    <p className="text-sm text-slate-400">{session?.email ?? "—"}</p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                      Admin RT {rtInfo.rt}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Nama Lengkap", field: "name",    type: "text", placeholder: "Nama lengkap" },
                    { label: "No. HP",       field: "phone",   type: "tel",  placeholder: "0812-xxx-xxxx" },
                    { label: "Alamat",       field: "address", type: "text", placeholder: "Alamat lengkap" },
                  ].map(({ label, field, type, placeholder }) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
                      <input
                        type={type}
                        value={(profileForm as any)[field]}
                        onChange={(e) => setProfileForm((f) => ({ ...f, [field]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 transition-colors"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
                </button>
              </div>
            </div>
          )}

          {/* ─ Info RT ─ */}
          {activeTab === "rt" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Informasi RT 05 Kapasan Dalam</h2>
                <p className="text-sm text-slate-400 mt-0.5">Data resmi RT 05, Kel. Kapasan, Kec. Simokerto, Surabaya</p>
              </div>
              <div className="p-6">
                <div className="grid gap-4">
                  {[
                    { label: "Nama RT/RW",   value: `RT ${rtInfo.rt} / RW ${rtInfo.rw}`    },
                    { label: "Kelurahan",    value: rtInfo.kelurahan                        },
                    { label: "Kecamatan",    value: rtInfo.kecamatan                        },
                    { label: "Kota",         value: rtInfo.kota                             },
                    { label: "Provinsi",     value: rtInfo.provinsi                         },
                    { label: "Ketua RT",     value: rtInfo.ketua                            },
                    { label: "Sekretaris",   value: rtInfo.sekretaris                       },
                    { label: "Bendahara",    value: rtInfo.bendahara                        },
                    { label: "Telepon",      value: rtInfo.noHP                             },
                    { label: "Email",        value: rtInfo.email                            },
                    { label: "Berdiri",      value: `Tahun ${rtInfo.tahunBerdiri}`          },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-4 py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-400 w-32 flex-shrink-0">{label}</span>
                      <span className="text-sm font-medium text-slate-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─ Pengaturan Iuran ─ */}
          {activeTab === "iuran" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Pengaturan Iuran Bulanan</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Nominal default akan otomatis diisi saat admin membuat tagihan baru
                </p>
              </div>

              {loadingIuran ? (
                <div className="p-10 text-center">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Memuat pengaturan...</p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Nominal */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nominal Iuran Default (per KK/bulan)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1 max-w-xs">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">Rp</span>
                        <input
                          type="number"
                          value={iuranSettings.nominalBulanan}
                          onChange={(e) => setIuranSettings((s) => ({ ...s, nominalBulanan: Number(e.target.value) }))}
                          min={0}
                          step={1000}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                      <span className="text-sm text-slate-500">
                        = {fmt(iuranSettings.nominalBulanan)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Nominal ini akan menjadi nilai default saat admin mencatat iuran baru.
                    </p>
                  </div>

                  {/* Current value display */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs text-blue-600 mb-1">Nominal aktif saat ini:</p>
                    <p className="text-2xl font-bold text-blue-800">{fmt(iuranSettings.nominalBulanan)}</p>
                    <p className="text-xs text-blue-500 mt-1">per KK per bulan</p>
                  </div>

                  {/* Allow custom nominal toggle */}
                  <div className="flex items-center justify-between py-3 border-t border-slate-100">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Izinkan Nominal Kustom</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Jika diaktifkan, admin dapat mengubah nominal per warga secara manual
                      </p>
                    </div>
                    <button
                      onClick={() => setIuranSettings((s) => ({ ...s, allowCustomNominal: !s.allowCustomNominal }))}
                      className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                        iuranSettings.allowCustomNominal ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        iuranSettings.allowCustomNominal ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>

                  {/* Save button */}
                  <button
                    onClick={handleSaveIuran}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 transition-colors"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                    ) : savedIuran ? (
                      <><CheckCircle2 className="w-4 h-4" /> Tersimpan!</>
                    ) : (
                      <><Save className="w-4 h-4" /> Simpan Pengaturan Iuran</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─ Keamanan ─ */}
          {activeTab === "keamanan" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Keamanan Akun</h2>
                <p className="text-sm text-slate-400 mt-0.5">Ubah kata sandi akun Anda</p>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { label: "Kata Sandi Lama", field: "current", show: showOldPass, toggle: () => setShowOldPass((v) => !v) },
                  { label: "Kata Sandi Baru",  field: "newPass", show: showNewPass, toggle: () => setShowNewPass((v) => !v) },
                  { label: "Konfirmasi",        field: "confirm", show: showNewPass, toggle: () => setShowNewPass((v) => !v) },
                ].map(({ label, field, show, toggle }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
                    <div className="relative">
                      <input
                        type={show ? "text" : "password"}
                        value={(passForm as any)[field]}
                        onChange={(e) => setPassForm((f) => ({ ...f, [field]: e.target.value }))}
                        className="w-full px-3 py-2.5 pr-10 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 transition-colors"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Lock className="w-4 h-4" /> Ubah Kata Sandi</>}
                </button>
              </div>
            </div>
          )}

          {/* ─ Notifikasi ─ */}
          {activeTab === "notifikasi" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Pengaturan Notifikasi</h2>
                <p className="text-sm text-slate-400 mt-0.5">Pilih notifikasi yang ingin diterima</p>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { id: "iuran",      label: "Iuran Belum Dibayar",    desc: "Notifikasi warga yang belum membayar iuran"      },
                  { id: "surat",      label: "Permohonan Surat Baru",   desc: "Notifikasi saat ada surat baru masuk"            },
                  { id: "pengumuman", label: "Pengumuman Baru",         desc: "Notifikasi saat pengumuman baru dibuat"          },
                  { id: "janji",      label: "Janji Temu",              desc: "Notifikasi saat ada janji temu baru"             },
                  { id: "laporan",    label: "Laporan Keuangan",        desc: "Notifikasi ringkasan keuangan bulanan"           },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifSettings((s) => ({ ...s, [item.id]: !s[item.id as keyof typeof s] }))}
                      className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                        notifSettings[item.id as keyof typeof notifSettings] ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        notifSettings[item.id as keyof typeof notifSettings] ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

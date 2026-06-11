/**
 * DataWarga — Firestore-backed warga management
 */
import { useState, useEffect, useMemo } from "react";
import {
  Search, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight,
  Users, Phone, MapPin, Briefcase, SlidersHorizontal, Loader2,
  CheckCircle2, AlertTriangle, RefreshCw,
} from "lucide-react";
import {
  collection, query, where, onSnapshot,
  doc, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { COLL, type WargaDoc } from "./data";
import { showToast } from "./ui";

// ─── Types ────────────────────────────────────────────────────────────────────
type WargaItem = WargaDoc & { uid: string };

type FormData = {
  name: string; email: string; phone: string; address: string;
  pekerjaan: string; nik: string; noKK: string; agama: string; status: "active" | "pending";
};

const emptyForm: FormData = {
  name: "", email: "", phone: "", address: "",
  pekerjaan: "", nik: "", noKK: "", agama: "", status: "active",
};

const AVATAR_COLORS = [
  "from-blue-400 to-indigo-500", "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-500", "from-orange-400 to-rose-500",
  "from-cyan-400 to-blue-500", "from-pink-400 to-fuchsia-500",
];

const PAGE_SIZE = 10;

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function DataWarga() {
  const [warga,   setWarga]   = useState<WargaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [modal,   setModal]   = useState<"add" | "edit" | "detail" | "delete" | null>(null);
  const [selected,setSelected]= useState<WargaItem | null>(null);
  const [form,    setForm]    = useState<FormData>(emptyForm);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Partial<FormData>>({});

  useEffect(() => {
    const q = query(collection(db, COLL.users), where("role", "==", "Warga"));
    const unsub = onSnapshot(q, (snap) => {
      setWarga(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as WargaItem)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return warga.filter(
      (w) =>
        w.name.toLowerCase().includes(s) ||
        w.address.toLowerCase().includes(s) ||
        (w.phone ?? "").includes(s) ||
        (w.pekerjaan ?? "").toLowerCase().includes(s),
    );
  }, [warga, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!form.name.trim())    e.name    = "Nama wajib diisi";
    if (!form.address.trim()) e.address = "Alamat wajib diisi";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setForm(emptyForm); setErrors({}); setModal("add");
  };

  const openEdit = (w: WargaItem) => {
    setSelected(w);
    setForm({
      name: w.name, email: w.email, phone: w.phone ?? "",
      address: w.address, pekerjaan: w.pekerjaan ?? "",
      nik: w.nik ?? "", noKK: w.noKK ?? "", agama: w.agama ?? "",
      status: w.status === "active" ? "active" : "pending",
    });
    setErrors({});
    setModal("edit");
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (modal === "add") {
        await addDoc(collection(db, COLL.users), {
          ...form, role: "Warga", createdAt: serverTimestamp(),
        });
        showToast(`Data ${form.name} berhasil ditambahkan`, "success");
      } else if (modal === "edit" && selected) {
        await updateDoc(doc(db, COLL.users, selected.uid), { ...form });
        showToast(`Data ${form.name} berhasil diperbarui`, "success");
      }
      setModal(null);
    } catch {
      showToast("Gagal menyimpan data. Coba lagi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, COLL.users, selected.uid));
      showToast(`Data ${selected.name} telah dihapus`, "success");
      setModal(null);
    } catch {
      showToast("Gagal menghapus data.", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field: keyof FormData) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all ${
      errors[field] ? "border-red-300" : "border-slate-200 bg-slate-50"
    }`;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Data Warga</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {loading ? "Memuat..." : `${warga.length} warga terdaftar`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Warga
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Warga", value: warga.length, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "Warga Aktif", value: warga.filter(w => w.status === "active").length, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { label: "Menunggu",    value: warga.filter(w => w.status === "pending").length, color: "text-orange-600 bg-orange-50 border-orange-200" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className={`text-2xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Cari nama, alamat, atau pekerjaan..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat data warga...</p>
          </div>
        ) : paged.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">
              {search ? "Tidak ada warga yang sesuai pencarian" : "Belum ada data warga"}
            </p>
            {!search && (
              <button onClick={openAdd} className="mt-3 text-sm text-blue-600 hover:underline">
                Tambah warga pertama
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["No", "Nama", "Kontak", "Pekerjaan", "Status", "Aksi"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paged.map((w, i) => {
                    const idx  = (page - 1) * PAGE_SIZE + i + 1;
                    const initials = w.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                    const colorIdx = (idx - 1) % AVATAR_COLORS.length;
                    return (
                      <tr key={w.uid} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-400">{idx}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} rounded-xl flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white text-xs font-bold">{initials}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{w.name}</p>
                              <p className="text-xs text-slate-400 truncate max-w-[180px]">{w.address}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-600">{w.phone || "-"}</p>
                          <p className="text-xs text-slate-400">{w.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{w.pekerjaan || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            w.status === "active"  ? "bg-emerald-100 text-emerald-700" :
                            w.status === "pending" ? "bg-orange-100 text-orange-700"   :
                                                     "bg-red-100 text-red-700"
                          }`}>
                            {w.status === "active" ? "Aktif" : w.status === "pending" ? "Menunggu" : "Ditolak"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => { setSelected(w); setModal("detail"); }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Detail"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEdit(w)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelected(w); setModal("delete"); }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        p === page ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Tambah Warga Baru" : "Edit Data Warga"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap *</label>
                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputClass("name")} placeholder="Masukkan nama lengkap" />
                {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nomor Telepon</label>
                <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className={inputClass("phone")} placeholder="0812-xxx-xxxx" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pekerjaan</label>
                <input value={form.pekerjaan} onChange={(e) => setForm(f => ({ ...f, pekerjaan: e.target.value }))}
                  className={inputClass("pekerjaan")} placeholder="Pekerjaan" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Alamat *</label>
                <textarea value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  className={`${inputClass("address")} resize-none`} rows={2} placeholder="Jl. Kapasan Dalam No. ..." />
                {errors.address && <p className="text-xs text-red-500 mt-0.5">{errors.address}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">NIK</label>
                <input value={form.nik} onChange={(e) => setForm(f => ({ ...f, nik: e.target.value }))}
                  className={inputClass("nik")} placeholder="16 digit NIK" maxLength={16} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">No. KK</label>
                <input value={form.noKK} onChange={(e) => setForm(f => ({ ...f, noKK: e.target.value }))}
                  className={inputClass("noKK")} placeholder="16 digit No. KK" maxLength={16} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Agama</label>
                <select value={form.agama} onChange={(e) => setForm(f => ({ ...f, agama: e.target.value }))}
                  className={inputClass("agama")}>
                  <option value="">Pilih agama</option>
                  {["Islam","Kristen","Katolik","Hindu","Buddha","Konghucu"].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className={inputClass("status")}>
                  <option value="active">Aktif</option>
                  <option value="pending">Menunggu</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2 transition-colors">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : "Simpan"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Detail Modal ── */}
      {modal === "detail" && selected && (
        <Modal title="Detail Warga" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {selected.name.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{selected.name}</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  selected.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {selected.status === "active" ? "Aktif" : "Menunggu"}
                </span>
              </div>
            </div>
            {[
              { label: "Email",      value: selected.email        },
              { label: "Telepon",    value: selected.phone        },
              { label: "Alamat",     value: selected.address      },
              { label: "Pekerjaan",  value: selected.pekerjaan    },
              { label: "NIK",        value: selected.nik          },
              { label: "No. KK",     value: selected.noKK         },
              { label: "Agama",      value: selected.agama        },
            ].map(({ label, value }) => value ? (
              <div key={label} className="flex gap-3">
                <span className="text-xs text-slate-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-slate-700 flex-1">{value}</span>
              </div>
            ) : null)}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { openEdit(selected); }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                Edit Data
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50 transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {modal === "delete" && selected && (
        <Modal title="Hapus Data Warga" onClose={() => setModal(null)}>
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-slate-700 mb-1">
              Hapus data <strong>{selected.name}</strong>?
            </p>
            <p className="text-sm text-slate-400 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50">
                Batal
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-70 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</> : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

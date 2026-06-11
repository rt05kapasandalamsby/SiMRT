/**
 * Iuran — Admin billing management with:
 *  - Searchable warga dropdown (fetched from Firestore users)
 *  - Auto-fill default nominal from Firestore settings/iuran_default
 *  - Full CRUD with Firestore real-time sync
 */
import { useState, useEffect, useMemo, useRef } from "react";
import {
  CheckCircle2, Clock, Plus, Search, X, CreditCard,
  Wallet, Loader2, Trash2, Edit2, ChevronDown,
  AlertTriangle, User, Settings,
} from "lucide-react";
import {
  collection, query, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, where, getDoc, setDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { rtInfo, COLL, SETTINGS_DOC, type IuranDoc, type WargaDoc, type SettingsDoc } from "./data";
import { showToast } from "./ui";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

function getBulanOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }));
  }
  return options;
}

// ─── Warga Searchable Dropdown ────────────────────────────────────────────────
type WargaOption = Pick<WargaDoc, "name" | "address" | "email"> & { uid: string };

function WargaSearchSelect({
  value, onSelect, wargaList, loadingWarga,
}: {
  value: string;
  onSelect: (w: WargaOption) => void;
  wargaList: WargaOption[];
  loadingWarga: boolean;
}) {
  const [search,   setSearch]   = useState("");
  const [open,     setOpen]     = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return wargaList.filter(
      (w) => w.name.toLowerCase().includes(q) || (w.address ?? "").toLowerCase().includes(q),
    );
  }, [wargaList, search]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={open ? search : value}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setSearch(""); }}
          placeholder={loadingWarga ? "Memuat data warga…" : "Cari & pilih nama warga aktif…"}
          disabled={loadingWarga}
          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
        />
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {/* Search hint */}
          {search === "" && (
            <div className="px-3 py-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Search className="w-3 h-3" />
                Ketik untuk menyaring daftar warga
              </div>
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              {loadingWarga ? "Memuat…" : wargaList.length === 0 ? "Belum ada warga aktif terdaftar" : `Tidak ada hasil untuk "${search}"`}
            </div>
          ) : (
            filtered.map((w) => (
              <button
                key={w.uid}
                type="button"
                onClick={() => { onSelect(w); setOpen(false); setSearch(""); }}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 group"
              >
                <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{w.name}</p>
                {w.address && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{w.address}</p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
export function Iuran() {
  // ── Data states ──────────────────────────────────────────────────────────────
  const [data,        setData]        = useState<(IuranDoc & { id: string })[]>([]);
  const [wargaList,   setWargaList]   = useState<WargaOption[]>([]);
  const [loadingIuran, setLoadingIuran] = useState(true);
  const [loadingWarga, setLoadingWarga] = useState(true);
  const [defaultNominal, setDefaultNominal] = useState<number>(rtInfo.iuranPokok);

  // ── Filter states ─────────────────────────────────────────────────────────
  const [search,  setSearch]  = useState("");
  const [bulan,   setBulan]   = useState(() =>
    new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
  );

  // ── Modal/form states ─────────────────────────────────────────────────────
  const [modal,    setModal]    = useState<"add" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<(IuranDoc & { id: string }) | null>(null);
  const [form,     setForm]     = useState({
    userId:    "",
    namaWarga: "",
    bulan:     "",
    jumlah:    rtInfo.iuranPokok,
    status:    "Belum Bayar" as "Lunas" | "Belum Bayar",
    tanggal:   "",
  });
  const [saving, setSaving] = useState(false);

  const bulanOptions = getBulanOptions();

  // ── Fetch active warga from Firestore ─────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, COLL.users),
      where("role",   "==", "Warga"),
      where("status", "==", "active"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setWargaList(
          snap.docs.map((d) => ({
            uid:     d.id,
            name:    d.data().name    ?? "",
            email:   d.data().email   ?? "",
            address: d.data().address ?? "",
          })),
        );
        setLoadingWarga(false);
      },
      () => setLoadingWarga(false),
    );
    return () => unsub();
  }, []);

  // ── Fetch default nominal from settings ───────────────────────────────────
  useEffect(() => {
    const ref = doc(db, COLL.settings, SETTINGS_DOC.iuranDefault);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SettingsDoc;
        setDefaultNominal(data.nominalBulanan ?? rtInfo.iuranPokok);
      }
    });
    return () => unsub();
  }, []);

  // ── Fetch iuran for selected bulan ────────────────────────────────────────
  useEffect(() => {
    setLoadingIuran(true);
    const q = query(collection(db, COLL.iuran), where("bulan", "==", bulan));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as IuranDoc & { id: string })));
        setLoadingIuran(false);
      },
      () => setLoadingIuran(false),
    );
    return () => unsub();
  }, [bulan]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter((d) => d.namaWarga.toLowerCase().includes(s));
  }, [data, search]);

  const totalLunas     = data.filter((d) => d.status === "Lunas").length;
  const totalBelum     = data.filter((d) => d.status === "Belum Bayar").length;
  const totalTerkumpul = data.filter((d) => d.status === "Lunas").reduce((s, d) => s + d.jumlah, 0);

  // ── Modal Openers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({
      userId: "", namaWarga: "", bulan,
      jumlah: defaultNominal, status: "Belum Bayar", tanggal: "",
    });
    setModal("add");
  };

  const openEdit = (item: IuranDoc & { id: string }) => {
    setSelected(item);
    setForm({
      userId:    item.userId    ?? "",
      namaWarga: item.namaWarga,
      bulan:     item.bulan,
      jumlah:    item.jumlah,
      status:    item.status,
      tanggal:   item.tanggal ?? "",
    });
    setModal("edit");
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.namaWarga.trim()) { showToast("Nama warga wajib dipilih", "error"); return; }
    if (!form.jumlah || form.jumlah <= 0) { showToast("Nominal iuran tidak valid", "error"); return; }

    setSaving(true);
    try {
      const tanggalFinal =
        form.status === "Lunas"
          ? (form.tanggal || new Date().toISOString().split("T")[0])
          : null;

      const payload: Omit<IuranDoc, "id"> = {
        userId:    form.userId    || undefined,
        namaWarga: form.namaWarga.trim(),
        bulan:     form.bulan,
        jumlah:    form.jumlah,
        status:    form.status,
        tanggal:   tanggalFinal,
        createdAt: serverTimestamp(),
      };

      if (modal === "add") {
        await addDoc(collection(db, COLL.iuran), payload);
        showToast(`Iuran ${form.namaWarga} bulan ${form.bulan} dicatat`, "success");
      } else if (selected) {
        await updateDoc(doc(db, COLL.iuran, selected.id), {
          ...payload,
          createdAt: selected.createdAt, // preserve original
        });
        showToast("Data iuran diperbarui", "success");
      }
      setModal(null);
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      showToast("Gagal menyimpan. Coba lagi.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, COLL.iuran, selected.id));
      showToast("Data iuran dihapus", "success");
      setModal(null);
    } catch {
      showToast("Gagal menghapus.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Bulk generate for all active warga ────────────────────────────────────
  const handleGenerateBulk = async () => {
    if (wargaList.length === 0) {
      showToast("Tidak ada warga aktif untuk di-generate", "warning");
      return;
    }
    // Find warga already in this month
    const existing = new Set(data.map((d) => d.userId ?? d.namaWarga));
    const toAdd = wargaList.filter(
      (w) => !existing.has(w.uid) && !existing.has(w.name),
    );
    if (toAdd.length === 0) {
      showToast("Semua warga aktif sudah memiliki tagihan bulan ini", "info");
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        toAdd.map((w) =>
          addDoc(collection(db, COLL.iuran), {
            userId:    w.uid,
            namaWarga: w.name,
            bulan,
            jumlah:    defaultNominal,
            status:    "Belum Bayar",
            tanggal:   null,
            createdAt: serverTimestamp(),
          }),
        ),
      );
      showToast(`${toAdd.length} tagihan iuran berhasil di-generate untuk bulan ${bulan}`, "success");
    } catch {
      showToast("Gagal generate tagihan.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Iuran Bulanan</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            RT 05 Kapasan Dalam · Default {fmt(defaultNominal)}/KK
            <span className="ml-1 text-blue-500">(dari pengaturan)</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleGenerateBulk}
            disabled={saving || loadingWarga}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all shadow-sm disabled:opacity-60"
          >
            <User className="w-4 h-4" />
            Generate Semua Warga
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Catat Iuran
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Lunas",       value: totalLunas,          icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { label: "Belum Bayar", value: totalBelum,          icon: Clock,        color: "text-orange-600  bg-orange-50  border-orange-200"  },
          { label: "Terkumpul",   value: fmt(totalTerkumpul), icon: Wallet,       color: "text-blue-600   bg-blue-50   border-blue-200"      },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.color} border rounded-2xl p-4 flex items-center gap-3`}>
              <Icon className={`w-5 h-5 flex-shrink-0 ${s.color.split(" ")[0]}`} />
              <div>
                <div className={`font-bold ${s.color.split(" ")[0]} text-lg leading-none`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama warga..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="relative">
          <select
            value={bulan} onChange={(e) => setBulan(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
          >
            {bulanOptions.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loadingIuran ? (
          <div className="p-10 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat data iuran...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">
              {search ? "Tidak ada hasil pencarian" : `Belum ada data iuran bulan ${bulan}`}
            </p>
            {!search && (
              <button onClick={openAdd} className="mt-3 text-sm text-blue-600 hover:underline">
                Catat iuran pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["No", "Nama Warga", "Bulan", "Jumlah", "Status", "Tgl Bayar", "Metode", "Aksi"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((item, i) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.namaWarga}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.bulan}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{fmt(item.jumlah)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                        item.status === "Lunas"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {item.status === "Lunas"
                          ? <><CheckCircle2 className="w-3 h-3" /> Lunas</>
                          : <><Clock className="w-3 h-3" /> Belum Bayar</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{item.tanggal ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.paymentMethod ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setSelected(item); setModal("delete"); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Catat Iuran Baru" : "Edit Data Iuran"}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            {/* Warga selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Nama Warga <span className="text-red-500">*</span>
              </label>
              {modal === "edit" ? (
                <input
                  value={form.namaWarga}
                  onChange={(e) => setForm((f) => ({ ...f, namaWarga: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              ) : (
                <WargaSearchSelect
                  value={form.namaWarga}
                  wargaList={wargaList}
                  loadingWarga={loadingWarga}
                  onSelect={(w) => setForm((f) => ({ ...f, namaWarga: w.name, userId: w.uid }))}
                />
              )}
              {wargaList.length === 0 && !loadingWarga && modal === "add" && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Belum ada warga aktif. Approve warga terlebih dahulu.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Bulan</label>
                <select
                  value={form.bulan}
                  onChange={(e) => setForm((f) => ({ ...f, bulan: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {bulanOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Jumlah (Rp)
                  {form.jumlah === defaultNominal && (
                    <span className="ml-1 text-blue-500 text-[10px]">← dari pengaturan</span>
                  )}
                </label>
                <input
                  type="number"
                  value={form.jumlah}
                  onChange={(e) => setForm((f) => ({ ...f, jumlah: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="Belum Bayar">Belum Bayar</option>
                  <option value="Lunas">Lunas</option>
                </select>
              </div>
              {form.status === "Lunas" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Tanggal Bayar</label>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : "Simpan"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {modal === "delete" && selected && (
        <Modal title="Hapus Data Iuran" onClose={() => setModal(null)}>
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-slate-700 mb-1">
              Hapus iuran <strong>{selected.namaWarga}</strong>?
            </p>
            <p className="text-sm text-slate-400 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm">
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

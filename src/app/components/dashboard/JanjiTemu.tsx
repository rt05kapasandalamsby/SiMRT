/**
 * JanjiTemu — Firestore-backed appointment management
 */
import { useState, useEffect } from "react";
import {
  Calendar, Plus, Edit2, Trash2, X, Search, Loader2,
  CheckCircle2, Clock, XCircle, Phone, AlertTriangle,
} from "lucide-react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { COLL, type JanjiTemuDoc } from "./data";
import { showToast } from "./ui";

type Item = JanjiTemuDoc & { id: string };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const KEPERLUAN_LIST = [
  "Pembuatan Surat Keterangan Tidak Mampu",
  "Pengurusan Surat Pengantar KTP",
  "Konsultasi Iuran",
  "Pengajuan Surat Keterangan Usaha",
  "Pembaruan Data Kartu Keluarga",
  "Pengurusan Surat Pengantar Nikah",
  "Pendaftaran Warga Baru",
  "Lainnya",
];

const STATUS_OPTS: JanjiTemuDoc["status"][] = ["Dikonfirmasi", "Menunggu", "Dibatalkan"];

const statusColor = (s: string) =>
  s === "Dikonfirmasi" ? "bg-emerald-100 text-emerald-700" :
  s === "Menunggu"     ? "bg-orange-100  text-orange-700"  :
                         "bg-red-100     text-red-700";

export function JanjiTemu() {
  const [items,   setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState<"add" | "edit" | "delete" | null>(null);
  const [selected,setSelected]= useState<Item | null>(null);
  const [form,    setForm]    = useState({
    nama: "", keperluan: KEPERLUAN_LIST[0], tanggal: "", jam: "08:00",
    noHP: "", status: "Menunggu" as JanjiTemuDoc["status"],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, COLL.janjiTemu), orderBy("tanggal", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const filtered = items.filter(
    (i) => i.nama.toLowerCase().includes(search.toLowerCase()) ||
           i.keperluan.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setForm({
      nama: "", keperluan: KEPERLUAN_LIST[0],
      tanggal: tomorrow.toISOString().split("T")[0],
      jam: "08:00", noHP: "", status: "Menunggu",
    });
    setModal("add");
  };

  const openEdit = (item: Item) => {
    setSelected(item);
    setForm({ nama: item.nama, keperluan: item.keperluan, tanggal: item.tanggal, jam: item.jam, noHP: item.noHP, status: item.status });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.nama.trim() || !form.tanggal) {
      showToast("Nama dan tanggal wajib diisi", "error");
      return;
    }
    setSaving(true);
    try {
      if (modal === "add") {
        await addDoc(collection(db, COLL.janjiTemu), { ...form, createdAt: serverTimestamp() });
        showToast(`Janji temu ${form.nama} berhasil dibuat`, "success");
      } else if (selected) {
        await updateDoc(doc(db, COLL.janjiTemu, selected.id), { ...form });
        showToast("Janji temu diperbarui", "success");
      }
      setModal(null);
    } catch {
      showToast("Gagal menyimpan. Coba lagi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, COLL.janjiTemu, selected.id));
      showToast("Janji temu dihapus", "success");
      setModal(null);
    } catch {
      showToast("Gagal menghapus.", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (item: Item, status: JanjiTemuDoc["status"]) => {
    try {
      await updateDoc(doc(db, COLL.janjiTemu, item.id), { status });
      showToast(`Status diubah ke ${status}`, "success");
    } catch {
      showToast("Gagal mengubah status.", "error");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Janji Temu</h1>
          <p className="text-sm text-slate-400 mt-0.5">Jadwal kunjungan warga ke pengurus RT 05</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Buat Janji Temu
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Dikonfirmasi", count: items.filter(i => i.status === "Dikonfirmasi").length, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { label: "Menunggu",     count: items.filter(i => i.status === "Menunggu").length,     color: "text-orange-600  bg-orange-50  border-orange-200"  },
          { label: "Dibatalkan",   count: items.filter(i => i.status === "Dibatalkan").length,   color: "text-red-600     bg-red-50     border-red-200"     },
        ].map((s) => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className={`text-2xl font-bold ${s.color.split(" ")[0]}`}>{s.count}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau keperluan..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat jadwal...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Belum ada jadwal janji temu</p>
            <button onClick={openAdd} className="mt-3 text-sm text-blue-600 hover:underline">Buat jadwal baru</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{item.nama}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{item.keperluan}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.tanggal}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.jam}</span>
                        {item.noHP && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.noHP}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <select value={item.status} onChange={(e) => updateStatus(item, e.target.value as any)}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                      {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setSelected(item); setModal("delete"); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Buat Janji Temu" : "Edit Janji Temu"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nama Warga *</label>
              <input value={form.nama} onChange={(e) => setForm(f => ({ ...f, nama: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Nama warga" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Keperluan</label>
              <select value={form.keperluan} onChange={(e) => setForm(f => ({ ...f, keperluan: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {KEPERLUAN_LIST.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal *</label>
                <input type="date" value={form.tanggal} onChange={(e) => setForm(f => ({ ...f, tanggal: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Jam</label>
                <input type="time" value={form.jam} onChange={(e) => setForm(f => ({ ...f, jam: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">No. HP</label>
                <input value={form.noHP} onChange={(e) => setForm(f => ({ ...f, noHP: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="0812-xxx-xxxx" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : "Simpan"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === "delete" && selected && (
        <Modal title="Hapus Janji Temu" onClose={() => setModal(null)}>
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-slate-700 mb-5">Hapus janji temu <strong>{selected.nama}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm">Batal</button>
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

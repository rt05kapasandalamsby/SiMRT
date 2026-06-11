/**
 * Pengumuman — Firestore-backed announcements management
 */
import { useState, useEffect } from "react";
import {
  Bell, Plus, Edit2, Trash2, X, Search, Loader2, AlertTriangle,
} from "lucide-react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { COLL, rtInfo, type PengumumanDoc } from "./data";
import { getSession } from "../../../auth";
import { showToast } from "./ui";

type Item = PengumumanDoc & { id: string };

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

const emptyForm = { judul: "", isi: "", status: "Aktif" as "Aktif" | "Nonaktif", prioritas: "Normal" as "Tinggi" | "Normal" | "Rendah" };

export function Pengumuman() {
  const [items,   setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState<"add" | "edit" | "delete" | null>(null);
  const [selected,setSelected]= useState<Item | null>(null);
  const [form,    setForm]    = useState(emptyForm);
  const [saving,  setSaving]  = useState(false);

  const user = getSession();

  useEffect(() => {
    const q = query(collection(db, COLL.pengumuman), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const filtered = items.filter(
    (i) => i.judul.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setForm(emptyForm);
    setModal("add");
  };

  const openEdit = (item: Item) => {
    setSelected(item);
    setForm({ judul: item.judul, isi: item.isi, status: item.status, prioritas: item.prioritas });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.judul.trim() || !form.isi.trim()) {
      showToast("Judul dan isi wajib diisi", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tanggal:  new Date().toISOString().split("T")[0],
        penulis:  user?.name ?? rtInfo.namaKetua,
        createdAt: serverTimestamp(),
      };
      if (modal === "add") {
        await addDoc(collection(db, COLL.pengumuman), payload);
        showToast("Pengumuman berhasil dipublikasikan", "success");
      } else if (selected) {
        await updateDoc(doc(db, COLL.pengumuman, selected.id), { judul: form.judul, isi: form.isi, status: form.status, prioritas: form.prioritas });
        showToast("Pengumuman berhasil diperbarui", "success");
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
      await deleteDoc(doc(db, COLL.pengumuman, selected.id));
      showToast("Pengumuman dihapus", "success");
      setModal(null);
    } catch {
      showToast("Gagal menghapus.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: Item) => {
    const newStatus = item.status === "Aktif" ? "Nonaktif" : "Aktif";
    try {
      await updateDoc(doc(db, COLL.pengumuman, item.id), { status: newStatus });
      showToast(`Pengumuman ${newStatus === "Aktif" ? "diaktifkan" : "dinonaktifkan"}`, "success");
    } catch {
      showToast("Gagal mengubah status.", "error");
    }
  };

  const prioritasColor = (p: string) =>
    p === "Tinggi" ? "bg-red-100 text-red-700" :
    p === "Normal" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500";

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pengumuman RT 05</h1>
          <p className="text-sm text-slate-400 mt-0.5">{items.filter(i => i.status === "Aktif").length} pengumuman aktif</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Buat Pengumuman
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari pengumuman..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>

      {loading ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Memuat pengumuman...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
          <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">{search ? "Tidak ditemukan" : "Belum ada pengumuman"}</p>
          {!search && <button onClick={openAdd} className="mt-3 text-sm text-blue-600 hover:underline">Buat pengumuman pertama</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id}
              className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-sm ${item.status === "Aktif" ? "border-slate-100" : "border-dashed border-slate-200 opacity-70"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                    item.prioritas === "Tinggi" ? "bg-red-400" : item.prioritas === "Normal" ? "bg-blue-400" : "bg-slate-300"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{item.judul}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prioritasColor(item.prioritas)}`}>
                        {item.prioritas}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === "Aktif" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed mb-2">{item.isi}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{item.tanggal}</span>
                      <span>•</span>
                      <span>{item.penulis}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleStatus(item)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${item.status === "Aktif" ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                    {item.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                  </button>
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

      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Buat Pengumuman Baru" : "Edit Pengumuman"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Judul *</label>
              <input value={form.judul} onChange={(e) => setForm(f => ({ ...f, judul: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Judul pengumuman" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Isi Pengumuman *</label>
              <textarea value={form.isi} onChange={(e) => setForm(f => ({ ...f, isi: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                rows={5} placeholder="Tulis isi pengumuman lengkap..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Prioritas</label>
                <select value={form.prioritas} onChange={(e) => setForm(f => ({ ...f, prioritas: e.target.value as any }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="Tinggi">Tinggi (Penting)</option>
                  <option value="Normal">Normal</option>
                  <option value="Rendah">Rendah</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : "Publikasikan"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === "delete" && selected && (
        <Modal title="Hapus Pengumuman" onClose={() => setModal(null)}>
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-slate-700 mb-5">Hapus pengumuman <strong>"{selected.judul}"</strong>?</p>
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

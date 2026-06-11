/**
 * Keuangan — Firestore-backed financial management
 */
import { useState, useEffect, useMemo } from "react";
import {
  Wallet, TrendingUp, TrendingDown, Plus, X, Loader2,
  ArrowUpCircle, ArrowDownCircle, Trash2,
} from "lucide-react";
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { COLL, type TransaksiDoc } from "./data";
import { showToast } from "./ui";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

type Item = TransaksiDoc & { id: string };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── CSS Bar Chart ────────────────────────────────────────────────────────────
function CSSBarChart({ data }: { data: { bulan: string; pemasukan: number; pengeluaran: number }[] }) {
  const max = Math.max(...data.flatMap((d) => [d.pemasukan, d.pengeluaran]), 1);
  return (
    <div className="relative" style={{ height: 200 }}>
      <div className="absolute inset-0 flex items-end pl-2 pb-6">
        {data.map((d) => (
          <div key={d.bulan} className="flex-1 flex flex-col items-center h-full">
            <div className="flex-1 w-full flex items-end justify-center gap-0.5">
              <div className="rounded-t bg-blue-500 transition-all" style={{ width: "40%", height: `${(d.pemasukan / max) * 88}%` }} />
              <div className="rounded-t bg-rose-400 transition-all" style={{ width: "40%", height: `${(d.pengeluaran / max) * 88}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-1">{d.bulan}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Keuangan() {
  const [items,   setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({ keterangan: "", jumlah: "", kategori: "Pemasukan" as "Pemasukan" | "Pengeluaran", tanggal: new Date().toISOString().split("T")[0] });
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    const q = query(collection(db, COLL.transaksi), orderBy("tanggal", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const totalPemasukan   = items.filter(i => i.jumlah > 0).reduce((s, i) => s + i.jumlah, 0);
  const totalPengeluaran = items.filter(i => i.jumlah < 0).reduce((s, i) => s + Math.abs(i.jumlah), 0);
  const saldo            = totalPemasukan - totalPengeluaran;

  // Build monthly chart
  const chartData = useMemo(() => {
    const months: Record<string, { pemasukan: number; pengeluaran: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("id-ID", { month: "short" });
      months[key] = { pemasukan: 0, pengeluaran: 0 };
    }
    items.forEach((item) => {
      if (!item.tanggal) return;
      const dt  = new Date(item.tanggal);
      const key = dt.toLocaleDateString("id-ID", { month: "short" });
      if (!months[key]) return;
      if (item.jumlah > 0) months[key].pemasukan  += item.jumlah;
      else                  months[key].pengeluaran += Math.abs(item.jumlah);
    });
    return Object.entries(months).map(([bulan, v]) => ({ bulan, ...v }));
  }, [items]);

  const handleSave = async () => {
    if (!form.keterangan.trim() || !form.jumlah) {
      showToast("Keterangan dan jumlah wajib diisi", "error"); return;
    }
    const nominal = parseFloat(form.jumlah.replace(/\D/g, ""));
    if (isNaN(nominal) || nominal <= 0) {
      showToast("Jumlah tidak valid", "error"); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, COLL.transaksi), {
        keterangan: form.keterangan,
        kategori:   form.kategori,
        jumlah:     form.kategori === "Pengeluaran" ? -nominal : nominal,
        tanggal:    form.tanggal,
        createdAt:  serverTimestamp(),
      });
      showToast("Transaksi berhasil dicatat", "success");
      setModal(false);
      setForm({ keterangan: "", jumlah: "", kategori: "Pemasukan", tanggal: new Date().toISOString().split("T")[0] });
    } catch {
      showToast("Gagal mencatat transaksi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Item) => {
    try {
      await deleteDoc(doc(db, COLL.transaksi, item.id));
      showToast("Transaksi dihapus", "success");
    } catch {
      showToast("Gagal menghapus.", "error");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Keuangan RT 05</h1>
          <p className="text-sm text-slate-400 mt-0.5">Catatan pemasukan dan pengeluaran</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Catat Transaksi
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Saldo Kas",     value: fmt(saldo),              color: saldo >= 0 ? "text-blue-600" : "text-red-600",    bg: "bg-blue-50    border-blue-200",    icon: Wallet       },
          { label: "Pemasukan",     value: fmt(totalPemasukan),     color: "text-emerald-600",                                bg: "bg-emerald-50 border-emerald-200",  icon: TrendingUp   },
          { label: "Pengeluaran",   value: fmt(totalPengeluaran),   color: "text-rose-600",                                   bg: "bg-rose-50    border-rose-200",    icon: TrendingDown },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} border rounded-2xl p-5 flex items-center gap-4`}>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <Icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-800">Grafik 6 Bulan Terakhir</h2>
          </div>
          <div className="flex gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Pemasukan</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-400 inline-block" /> Pengeluaran</span>
          </div>
        </div>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-300">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <CSSBarChart data={chartData} />
        )}
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Riwayat Transaksi</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat transaksi...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Belum ada transaksi</p>
            <button onClick={() => setModal(true)} className="mt-3 text-sm text-blue-600 hover:underline">Catat transaksi pertama</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.jumlah > 0 ? "bg-emerald-100" : "bg-rose-100"}`}>
                  {item.jumlah > 0
                    ? <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                    : <ArrowDownCircle className="w-4 h-4 text-rose-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.keterangan}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.tanggal} • {item.kategori}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${item.jumlah > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {item.jumlah > 0 ? "+" : ""}{fmt(item.jumlah)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <Modal title="Catat Transaksi Baru" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Keterangan *</label>
              <input value={form.keterangan} onChange={(e) => setForm(f => ({ ...f, keterangan: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Keterangan transaksi" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kategori</label>
                <select value={form.kategori} onChange={(e) => setForm(f => ({ ...f, kategori: e.target.value as any }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="Pemasukan">Pemasukan</option>
                  <option value="Pengeluaran">Pengeluaran</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah (Rp) *</label>
                <input type="number" value={form.jumlah} onChange={(e) => setForm(f => ({ ...f, jumlah: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="0" min={0} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal</label>
              <input type="date" value={form.tanggal} onChange={(e) => setForm(f => ({ ...f, tanggal: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : "Simpan"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

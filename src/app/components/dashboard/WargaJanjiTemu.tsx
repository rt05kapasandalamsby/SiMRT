/**
 * WargaJanjiTemu — Firestore-backed appointment booking for Warga
 */
import { useState, useEffect } from "react";
import {
  Calendar, Clock, Plus, X, CheckCircle2, XCircle,
  Phone, Loader2, AlertCircle,
} from "lucide-react";
import {
  collection, query, where, onSnapshot, addDoc,
  updateDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { COLL, type JanjiTemuDoc } from "./data";
import { type AuthUser } from "../../../auth";
import { showToast } from "./ui";

type Item = JanjiTemuDoc & { id: string };

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

const statusColor = (s: string) =>
  s === "Dikonfirmasi" ? "bg-emerald-100 text-emerald-700" :
  s === "Menunggu"     ? "bg-orange-100  text-orange-700"  :
                         "bg-red-100     text-red-700";

function BookingModal({ user, onClose, onSaved }: { user: AuthUser; onClose: () => void; onSaved: () => void }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [form, setForm] = useState({
    keperluan: KEPERLUAN_LIST[0],
    tanggal:   tomorrow.toISOString().split("T")[0],
    jam:       "08:00",
    noHP:      user.phone ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.tanggal) { showToast("Tanggal wajib diisi", "error"); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, COLL.janjiTemu), {
        nama:      user.name,
        userId:    user.uid,
        keperluan: form.keperluan,
        tanggal:   form.tanggal,
        jam:       form.jam,
        noHP:      form.noHP,
        status:    "Menunggu",
        createdAt: serverTimestamp(),
      });
      showToast("Permintaan janji temu telah dikirim. Tunggu konfirmasi admin.", "success");
      onSaved();
    } catch {
      showToast("Gagal membuat janji temu. Coba lagi.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Buat Janji Temu</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>Janji temu akan dikonfirmasi oleh pengurus RT 05. Anda akan dihubungi via WhatsApp.</p>
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
              <input type="date" value={form.tanggal}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm(f => ({ ...f, tanggal: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Jam</label>
              <select value={form.jam} onChange={(e) => setForm(f => ({ ...f, jam: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {["08:00","09:00","10:00","11:00","13:00","14:00","15:00"].map(j => (
                  <option key={j} value={j}>{j} WIB</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">No. HP / WhatsApp</label>
            <input value={form.noHP} onChange={(e) => setForm(f => ({ ...f, noHP: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="0812-xxx-xxxx" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</> : "Kirim Permintaan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WargaJanjiTemu({ user }: { user: AuthUser }) {
  const [items,    setItems]    = useState<Item[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, COLL.janjiTemu), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
      docs.sort((a, b) => (a.tanggal > b.tanggal ? 1 : -1));
      setItems(docs);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user.uid]);

  const handleCancel = async (item: Item) => {
    try {
      await updateDoc(doc(db, COLL.janjiTemu, item.id), { status: "Dibatalkan" });
      showToast("Janji temu dibatalkan", "success");
    } catch {
      showToast("Gagal membatalkan.", "error");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Janji Temu</h1>
          <p className="text-sm text-slate-400 mt-0.5">Jadwal kunjungan ke pengurus RT 05</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Buat Janji
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Memuat jadwal...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
          <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Belum ada janji temu</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-blue-600 hover:underline">Buat janji temu baru</button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`bg-white rounded-2xl border p-4 ${item.status === "Dikonfirmasi" ? "border-emerald-200" : item.status === "Menunggu" ? "border-orange-200" : "border-slate-100 opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.status === "Dikonfirmasi" ? "bg-emerald-100" :
                    item.status === "Menunggu"     ? "bg-orange-100"  : "bg-slate-100"
                  }`}>
                    <Calendar className={`w-5 h-5 ${
                      item.status === "Dikonfirmasi" ? "text-emerald-500" :
                      item.status === "Menunggu"     ? "text-orange-400"  : "text-slate-400"
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.keperluan}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.tanggal}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.jam} WIB</span>
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              {item.status === "Menunggu" && (
                <button onClick={() => handleCancel(item)}
                  className="mt-3 text-xs text-red-500 hover:underline">
                  Batalkan
                </button>
              )}
              {item.status === "Dikonfirmasi" && (
                <div className="mt-3 p-2 bg-emerald-50 rounded-xl text-xs text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Janji temu Anda telah dikonfirmasi. Harap datang tepat waktu.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BookingModal
          user={user}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// Keep WargaNotifPanel exported (used in older imports)
export function WargaNotifPanel() {
  return null;
}

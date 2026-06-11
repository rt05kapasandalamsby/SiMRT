/**
 * NotifikasiPage — Firestore-backed notification center
 */
import { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertCircle, Info, Trash2, Loader2 } from "lucide-react";
import {
  collection, onSnapshot, updateDoc, deleteDoc,
  doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { COLL } from "./data";

interface NotifDoc {
  id:      string;
  judul:   string;
  pesan:   string;
  waktu:   string;
  tipe:    "warning" | "success" | "info";
  dibaca:  boolean;
}

export function NotifikasiPage() {
  const [notifs,   setNotifs]   = useState<NotifDoc[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const q = query(collection(db, COLL.notifikasi), orderBy("waktu", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotifDoc)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, COLL.notifikasi, id), { dibaca: true });
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLL.notifikasi, id));
    } catch { /* silent */ }
  };

  const markAll = async () => {
    const unread = notifs.filter((n) => !n.dibaca);
    await Promise.all(unread.map((n) => updateDoc(doc(db, COLL.notifikasi, n.id), { dibaca: true })));
  };

  const unread = notifs.filter((n) => !n.dibaca).length;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Notifikasi</h1>
          <p className="text-sm text-slate-400 mt-0.5">{unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="text-xs text-blue-600 hover:underline font-medium">
            Tandai semua dibaca
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat notifikasi...</p>
          </div>
        ) : notifs.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Tidak ada notifikasi</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifs.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors group ${!n.dibaca ? "bg-blue-50/40" : ""}`}
                onClick={() => !n.dibaca && markRead(n.id)}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  n.tipe === "warning" ? "bg-orange-100" :
                  n.tipe === "success" ? "bg-emerald-100" : "bg-blue-100"
                }`}>
                  {n.tipe === "warning"
                    ? <AlertCircle className="w-4 h-4 text-orange-500" />
                    : n.tipe === "success"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <Info className="w-4 h-4 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{n.judul}</p>
                    {!n.dibaca && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.pesan}</p>
                  <p className="text-xs text-slate-400 mt-1">{n.waktu}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

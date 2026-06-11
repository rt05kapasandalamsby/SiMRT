/**
 * Aktivitas — Firestore-backed activity log
 */
import { useState, useEffect } from "react";
import {
  Activity, FileText, Bell, CreditCard, BarChart2,
  Calendar, Edit, UserPlus, Loader2, Trash2,
} from "lucide-react";
import {
  collection, onSnapshot, query, orderBy, addDoc,
  deleteDoc, doc, serverTimestamp, limit,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { COLL, type AktivitasDoc } from "./data";
import { showToast } from "./ui";
import { getSession } from "../../../auth";

type Item = AktivitasDoc & { id: string };

const iconMap: Record<string, React.ElementType> = {
  FileText, UserPlus, Bell, CreditCard, BarChart2, Calendar, Edit, Activity,
};

const colorMap: Record<string, string> = {
  blue:    "bg-blue-100    text-blue-600",
  green:   "bg-green-100   text-green-600",
  orange:  "bg-orange-100  text-orange-600",
  emerald: "bg-emerald-100 text-emerald-600",
  purple:  "bg-purple-100  text-purple-600",
  red:     "bg-red-100     text-red-600",
  gray:    "bg-gray-100    text-gray-600",
};

export function Aktivitas() {
  const [items,   setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getSession();

  useEffect(() => {
    const q = query(
      collection(db, COLL.aktivitas),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLL.aktivitas, id));
    } catch {
      showToast("Gagal menghapus log.", "error");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Riwayat Aktivitas</h1>
        <p className="text-sm text-slate-400 mt-0.5">Log aktivitas sistem RT 05</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat aktivitas...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Activity className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Belum ada aktivitas tercatat</p>
            <p className="text-xs text-slate-300 mt-1">
              Aktivitas akan muncul otomatis saat admin melakukan tindakan
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map((act) => {
              const Icon  = iconMap[act.ikon] || Activity;
              const color = colorMap[act.warna] || colorMap.gray;
              return (
                <div key={act.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{act.aksi}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{act.pengguna}</span>
                      <span>•</span>
                      <span>{act.waktu}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(act.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper: log an activity from anywhere ───────────────────────────────────
export async function logAktivitas(
  aksi: string,
  opts: { pengguna?: string; ikon?: string; warna?: string } = {},
) {
  try {
    const now = new Date();
    await addDoc(collection(db, COLL.aktivitas), {
      aksi,
      pengguna: opts.pengguna ?? "Sistem",
      waktu:    now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      ikon:     opts.ikon   ?? "Activity",
      warna:    opts.warna  ?? "gray",
      createdAt: serverTimestamp(),
    });
  } catch {
    // Silent fail for logging
  }
}

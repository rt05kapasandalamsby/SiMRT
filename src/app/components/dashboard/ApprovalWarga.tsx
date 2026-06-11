/**
 * ApprovalWarga — Admin page to approve or reject pending Warga accounts
 */
import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, deleteDoc, orderBy, Timestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { COLL, type WargaDoc } from "./data";
import {
  UserCheck, UserX, Clock, Users, CheckCircle2, XCircle,
  Phone, MapPin, Mail, AlertCircle, RefreshCw,
} from "lucide-react";
import { showToast } from "./ui";
import { motion, AnimatePresence } from "motion/react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(ts: any): string {
  if (!ts) return "-";
  try {
    const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

type PendingUser = WargaDoc & { uid: string };

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel, danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
      >
        <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm transition-colors ${
              danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ApprovalWarga() {
  const [pending,  setPending]  = useState<PendingUser[]>([]);
  const [approved, setApproved] = useState<PendingUser[]>([]);
  const [rejected, setRejected] = useState<PendingUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"pending" | "approved" | "rejected">("pending");
  const [confirm,  setConfirm]  = useState<{
    open: boolean;
    uid: string;
    name: string;
    action: "approve" | "reject";
  }>({ open: false, uid: "", name: "", action: "approve" });

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, COLL.users),
      where("role", "==", "Warga"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as PendingUser));
      setPending(all.filter((u) => u.status === "pending"));
      setApproved(all.filter((u) => u.status === "active"));
      setRejected(all.filter((u) => u.status === "rejected"));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleApprove = async (uid: string, name: string) => {
    try {
      await updateDoc(doc(db, COLL.users, uid), { status: "active" });
      showToast(`Akun ${name} berhasil disetujui`, "success");
    } catch {
      showToast("Gagal menyetujui akun. Coba lagi.", "error");
    }
  };

  const handleReject = async (uid: string, name: string) => {
    try {
      await updateDoc(doc(db, COLL.users, uid), { status: "rejected" });
      showToast(`Akun ${name} telah ditolak`, "warning");
    } catch {
      showToast("Gagal menolak akun. Coba lagi.", "error");
    }
  };

  const handleDelete = async (uid: string, name: string) => {
    try {
      await deleteDoc(doc(db, COLL.users, uid));
      showToast(`Data ${name} telah dihapus`, "success");
    } catch {
      showToast("Gagal menghapus data.", "error");
    }
  };

  const handleRevoke = async (uid: string, name: string) => {
    try {
      await updateDoc(doc(db, COLL.users, uid), { status: "rejected" });
      showToast(`Akses ${name} telah dicabut`, "warning");
    } catch {
      showToast("Gagal mencabut akses.", "error");
    }
  };

  const tabs = [
    { id: "pending"  as const, label: "Menunggu",  count: pending.length,  color: "text-orange-600 bg-orange-50" },
    { id: "approved" as const, label: "Aktif",     count: approved.length, color: "text-emerald-600 bg-emerald-50" },
    { id: "rejected" as const, label: "Ditolak",   count: rejected.length, color: "text-red-600 bg-red-50" },
  ];

  const currentList =
    tab === "pending" ? pending :
    tab === "approved" ? approved : rejected;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Approval Warga</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Kelola permohonan akun warga RT 05
          </p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-700 font-medium">
              {pending.length} permintaan menunggu
            </span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Menunggu",  count: pending.length,  bg: "bg-orange-50  border-orange-200",  icon: Clock,       color: "text-orange-600" },
          { label: "Aktif",     count: approved.length, bg: "bg-emerald-50 border-emerald-200", icon: UserCheck,   color: "text-emerald-600" },
          { label: "Ditolak",   count: rejected.length, bg: "bg-red-50     border-red-200",     icon: UserX,       color: "text-red-600" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${c.bg} border rounded-2xl p-4 flex items-center gap-3`}>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <Icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${c.color}`}>{c.count}</div>
                <div className="text-xs text-slate-500">{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white shadow-sm text-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${t.color}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat data...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Tidak ada data</p>
            <p className="text-slate-300 text-sm mt-1">
              {tab === "pending"
                ? "Belum ada permintaan masuk"
                : tab === "approved"
                ? "Belum ada warga aktif"
                : "Tidak ada akun yang ditolak"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            <AnimatePresence>
              {currentList.map((user, i) => (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">
                        {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{user.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          user.status === "active"   ? "bg-emerald-100 text-emerald-700" :
                          user.status === "pending"  ? "bg-orange-100  text-orange-700"  :
                                                       "bg-red-100     text-red-700"
                        }`}>
                          {user.status === "active" ? "Aktif" : user.status === "pending" ? "Menunggu" : "Ditolak"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Mail className="w-3 h-3" /> {user.email}
                        </span>
                        {user.phone && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Phone className="w-3 h-3" /> {user.phone}
                          </span>
                        )}
                        {user.address && (
                          <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-xs">
                            <MapPin className="w-3 h-3 flex-shrink-0" /> {user.address}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Daftar: {fmtDate(user.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {tab === "pending" && (
                      <>
                        <button
                          onClick={() => setConfirm({ open: true, uid: user.uid, name: user.name, action: "approve" })}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                        </button>
                        <button
                          onClick={() => setConfirm({ open: true, uid: user.uid, name: user.name, action: "reject" })}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Tolak
                        </button>
                      </>
                    )}
                    {tab === "approved" && (
                      <button
                        onClick={() => handleRevoke(user.uid, user.name)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-medium rounded-xl transition-colors"
                      >
                        <UserX className="w-3.5 h-3.5" /> Cabut Akses
                      </button>
                    )}
                    {tab === "rejected" && (
                      <>
                        <button
                          onClick={() => handleApprove(user.uid, user.name)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aktifkan
                        </button>
                        <button
                          onClick={() => handleDelete(user.uid, user.name)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-medium rounded-xl transition-colors"
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm((p) => ({ ...p, open: false }))}
        onConfirm={() =>
          confirm.action === "approve"
            ? handleApprove(confirm.uid, confirm.name)
            : handleReject(confirm.uid, confirm.name)
        }
        title={confirm.action === "approve" ? "Setujui Akun?" : "Tolak Akun?"}
        message={
          confirm.action === "approve"
            ? `Akun ${confirm.name} akan diaktifkan dan dapat login ke sistem.`
            : `Akun ${confirm.name} akan ditolak dan tidak dapat login.`
        }
        confirmLabel={confirm.action === "approve" ? "Ya, Setujui" : "Ya, Tolak"}
        danger={confirm.action === "reject"}
      />
    </div>
  );
}

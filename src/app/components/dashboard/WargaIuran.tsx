/**
 * WargaIuran — Iuran view for Warga with Midtrans Snap payment gateway
 *
 * Payment flow:
 *  1. User clicks "Bayar" on an unpaid iuran
 *  2. Frontend calls backend POST /create-transaction → snapToken
 *  3. Midtrans Snap popup opens (QRIS / bank transfer / e-wallet)
 *  4. On success/pending → show "Menunggu konfirmasi pembayaran…"
 *  5. Backend webhook (POST /midtrans-webhook) updates Firestore when settled
 *  6. UI updates automatically via onSnapshot listener
 */

import { useState, useEffect } from "react";
import {
  CheckCircle2, Clock, CreditCard, X,
  Loader2, ShieldCheck, AlertCircle,
  Banknote, Smartphone, ScanLine, Info,
} from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import { rtInfo, COLL, type IuranDoc } from "./data";
import { type AuthUser } from "../../../auth";
import { showToast } from "./ui";
import { useSnapScript } from "../../../hooks/useSnapScript";

// ─── Backend URL ──────────────────────────────────────────────────────────────
// In development: http://localhost:3001
// In production : set VITE_BACKEND_URL in your .env file
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);

type Item = IuranDoc & { id: string };

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({
  item,
  user,
  onClose,
  onPaid,
}: {
  item:    Item;
  user:    AuthUser;
  onClose: () => void;
  onPaid:  () => void;
}) {
  const snapState       = useSnapScript();
  const [paying,        setPaying]        = useState(false);
  const [paidPending,   setPaidPending]   = useState(false);
  const [backendError,  setBackendError]  = useState("");

  // Reset error when modal opens
  useEffect(() => { setBackendError(""); }, []);

  const handlePay = async () => {
    if (snapState !== "ready") {
      showToast("Gateway pembayaran belum siap. Coba lagi.", "error");
      return;
    }

    setPaying(true);
    setBackendError("");

    try {
      // ── 1. Get snap token from backend ──────────────────────────────────
      const response = await fetch(`${BACKEND_URL}/create-transaction`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:    item.jumlah,
          iuranId:   item.id,
          namaWarga: user.name,
          email:     user.email,
          bulan:     item.bulan,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${response.status}`);
      }

      const { snapToken } = await response.json() as { snapToken: string; orderId: string };

      if (!snapToken) throw new Error("Snap token tidak diterima dari server");

      setPaying(false);

      // ── 2. Open Midtrans Snap popup ─────────────────────────────────────
      window.snap.pay(snapToken, {
        language: "id",

        onSuccess: (_result) => {
          // NOTE: Do NOT mark Lunas here — trust the webhook only.
          // The webhook will update Firestore when payment is confirmed.
          showToast("Pembayaran diterima! Menunggu konfirmasi otomatis…", "success");
          setPaidPending(true);
        },

        onPending: (_result) => {
          showToast("Pembayaran tertunda. Status akan diperbarui otomatis.", "info");
          setPaidPending(true);
        },

        onError: (result) => {
          if (import.meta.env.DEV) console.error("[Snap] Payment error:", result);
          showToast("Pembayaran gagal. Silakan coba metode lain.", "error");
          setPaidPending(false);
        },

        onClose: () => {
          // User closed popup without completing payment — just dismiss modal
          if (!paidPending) onClose();
        },
      });
    } catch (err: any) {
      if (import.meta.env.DEV) console.error("[PaymentModal] Error:", err);
      const msg =
        err.message?.includes("Failed to fetch")
          ? "Tidak bisa terhubung ke server backend. Pastikan backend berjalan di port 3001."
          : err.message ?? "Terjadi kesalahan. Silakan coba lagi.";
      setBackendError(msg);
      setPaying(false);
    }
  };

  // ── Success / pending screen ──────────────────────────────────────────────
  if (paidPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Clock className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg mb-2">
            Menunggu Konfirmasi
          </h3>
          <p className="text-sm text-slate-500 mb-1">
            Pembayaran Anda sedang diverifikasi.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Status iuran <span className="font-semibold text-blue-700">{item.bulan}</span> akan
            diperbarui secara otomatis setelah konfirmasi dari sistem pembayaran.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 text-xs text-blue-600 text-left flex items-start gap-2">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Proses konfirmasi biasanya berlangsung kurang dari 1 menit. Halaman ini akan otomatis terupdate.</span>
          </div>
          <button
            onClick={onPaid}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Kembali ke Iuran
          </button>
        </div>
      </div>
    );
  }

  // ── Normal payment modal ──────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">Bayar Iuran</h3>
            <p className="text-xs text-slate-400 mt-0.5">{item.bulan}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Amount display */}
          <div className="text-center py-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
            <p className="text-xs text-blue-400 mb-1">Total Pembayaran</p>
            <p className="text-4xl font-bold text-blue-700">{fmt(item.jumlah)}</p>
            <p className="text-xs text-blue-400 mt-1">
              Iuran {item.bulan} — RT {rtInfo.rt} Kapasan Dalam
            </p>
          </div>

          {/* Backend error */}
          {backendError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-600 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Gagal terhubung ke gateway</p>
                <p className="text-red-500">{backendError}</p>
              </div>
            </div>
          )}

          {/* Payment methods info — Midtrans provides these natively */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2.5">
              Metode pembayaran tersedia:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: ScanLine,   label: "QRIS",          color: "text-purple-600 bg-purple-50" },
                { icon: Banknote,   label: "Transfer Bank", color: "text-blue-600   bg-blue-50"   },
                { icon: Smartphone, label: "E-Wallet",      color: "text-green-600  bg-green-50"  },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${color} border border-white/0`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Snap not ready warning */}
          {snapState === "loading" && (
            <div className="flex items-center gap-2 text-slate-400 text-xs justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Memuat gateway pembayaran…
            </div>
          )}
          {snapState === "error" && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Gagal memuat gateway. Periksa koneksi internet Anda.
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={paying || snapState !== "ready"}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
          >
            {paying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyiapkan Pembayaran…
              </>
            ) : snapState === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memuat Gateway…
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Bayar Sekarang
              </>
            )}
          </button>

          {/* Security note */}
          <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Transaksi diproses aman oleh Midtrans
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main WargaIuran Component ────────────────────────────────────────────────
export function WargaIuran({ user }: { user: AuthUser }) {
  const [items,   setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState<Item | null>(null);

  // Pre-load Snap script so it's ready when user clicks "Bayar"
  useSnapScript();

  useEffect(() => {
    const q = query(
      collection(db, COLL.iuran),
      where("namaWarga", "==", user.name),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
        // Sort by bulan descending (most recent first)
        docs.sort((a, b) => (b.bulan > a.bulan ? 1 : -1));
        setItems(docs);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [user.name]);

  const lunas = items.filter((i) => i.status === "Lunas");
  const belum = items.filter((i) => i.status === "Belum Bayar");

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Iuran Saya</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Riwayat iuran bulanan RT {rtInfo.rt} Kapasan Dalam
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-slate-500">Lunas</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{lunas.length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-medium text-slate-500">Belum Bayar</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{belum.length}</p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Memuat data iuran…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
          <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Belum ada data iuran</p>
          <p className="text-xs text-slate-300 mt-1">
            Data iuran akan muncul setelah admin mencatatkan tagihan
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-all ${
                item.status === "Belum Bayar"
                  ? "border-orange-200 hover:border-orange-300 hover:shadow-sm"
                  : "border-slate-100"
              }`}
            >
              {/* Status icon */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  item.status === "Lunas" ? "bg-emerald-100" : "bg-orange-100"
                }`}
              >
                {item.status === "Lunas" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Clock className="w-5 h-5 text-orange-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.bulan}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {item.status === "Lunas"
                    ? `Dibayar: ${item.tanggal ?? "-"}${(item as any).paymentMethod ? ` · via ${(item as any).paymentMethod}` : ""}`
                    : `Tagihan: ${fmt(item.jumlah)}`}
                </p>
              </div>

              {/* Amount + action */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-slate-700">{fmt(item.jumlah)}</p>
                {item.status === "Belum Bayar" ? (
                  <button
                    onClick={() => setPaying(item)}
                    className="mt-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    Bayar
                  </button>
                ) : (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 justify-end mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Lunas
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment modal */}
      {paying && (
        <PaymentModal
          item={paying}
          user={user}
          onClose={() => setPaying(null)}
          onPaid={() => setPaying(null)}
        />
      )}
    </div>
  );
}
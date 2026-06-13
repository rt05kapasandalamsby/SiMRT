/**
 * DashboardHome — Admin overview with real Firestore data
 */
import { useState, useEffect } from "react";
import {
  Users, CreditCard, Bell, Wallet, TrendingUp, TrendingDown,
  ArrowRight, CheckCircle2, Clock, FileText,
  UserPlus, Activity, BarChart2, Edit, Calendar,
  Loader2, RefreshCw,
} from "lucide-react";
import { motion } from "motion/react";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { rtInfo, COLL, type Page, type IuranDoc, type PengumumanDoc, type AktivitasDoc } from "./data";
import { Avatar, AnimListItem, showToast } from "./ui";
import { savePublicStats } from "../../lib/rtStats";


// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

function fmtDate(ts: any): string {
  if (!ts) return "";
  try {
    const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return ""; }
}

// ─── CSS Bar Chart (no recharts) ─────────────────────────────────────────────
function CSSBarChart({ data }: { data: { bulan: string; pemasukan: number; pengeluaran: number }[] }) {
  const max = Math.max(...data.flatMap((d) => [d.pemasukan, d.pengeluaran]), 1);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="relative" style={{ height: 220 }}>
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
        {[...yTicks].reverse().map((t) => {
          const v = Math.round((max * t) / 1000) * 1000;
          return (
            <div key={`ytick-${t}`} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-8 text-right flex-shrink-0">
                {v === 0 ? "0" : `${v / 1000}rb`}
              </span>
              <div className="flex-1 border-t border-slate-100" />
            </div>
          );
        })}
      </div>
      <div className="absolute inset-0 flex items-end pl-10 pb-0">
        {data.map((d) => (
          <div key={`bar-${d.bulan}`} className="flex-1 flex flex-col items-center" style={{ height: "100%" }}>
            <div className="flex-1 w-full flex items-end justify-center gap-0.5 pb-0">
              <div className="rounded-t bg-blue-500" style={{ width: "38%", height: `${(d.pemasukan / max) * 88}%` }} />
              <div className="rounded-t bg-rose-400" style={{ width: "38%", height: `${(d.pengeluaran / max) * 88}%` }} />
            </div>
            <span className="text-[11px] text-slate-400 mt-1.5 pb-0.5">{d.bulan}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const activityColors: Record<string, string> = {
  blue:    "bg-blue-100 text-blue-600",
  green:   "bg-green-100 text-green-600",
  orange:  "bg-orange-100 text-orange-600",
  emerald: "bg-emerald-100 text-emerald-600",
  purple:  "bg-purple-100 text-purple-600",
  red:     "bg-red-100 text-red-600",
  gray:    "bg-gray-100 text-gray-600",
};

const activityIconMap: Record<string, React.ElementType> = {
  FileText, UserPlus, Bell, CreditCard, BarChart2, Calendar, Edit, Activity,
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-slate-200 rounded-lg animate-pulse ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 animate-pulse">
      <div className="h-28 bg-slate-200 rounded-2xl" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className="flex justify-between mb-4">
              <Skeleton className="w-11 h-11 rounded-xl" />
              <Skeleton className="w-24 h-6 rounded-full" />
            </div>
            <Skeleton className="w-28 h-7 mb-2" />
            <Skeleton className="w-20 h-4" />
          </div>
        ))}
      </div>
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 p-5">
          <Skeleton className="w-36 h-5 mb-2" />
          <Skeleton className="h-48 w-full mt-4" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <Skeleton className="w-32 h-5 mb-4" />
          {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full mb-2 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DashboardHome({ setPage }: { setPage: (p: Page) => void }) {
  const [loading,      setLoading]      = useState(true);
  const [totalWarga,   setTotalWarga]   = useState(0);
  const [totalLunas,   setTotalLunas]   = useState(0);
  const [totalIuran,   setTotalIuran]   = useState(0);
  const [totalBulan,   setTotalBulan]   = useState(0);
  const [saldoKas,     setSaldoKas]     = useState(0);
  const [pengAktif,    setPengAktif]    = useState(0);
  const [iuranList,    setIuranList]    = useState<IuranDoc[]>([]);
  const [pengList,     setPengList]     = useState<PengumumanDoc[]>([]);
  const [aktivitas,    setAktivitas]    = useState<AktivitasDoc[]>([]);
  const [keuangan,     setKeuangan]     = useState<{bulan:string;pemasukan:number;pengeluaran:number}[]>([]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Warga count
    unsubs.push(onSnapshot(
      query(collection(db, COLL.users), where("role", "==", "Warga"), where("status", "==", "active")),
      (snap) => setTotalWarga(snap.size),
    ));

    // Iuran current month
    const bulanIni = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    unsubs.push(onSnapshot(
      query(collection(db, COLL.iuran), where("bulan", "==", bulanIni)),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as IuranDoc));
        setIuranList(docs);
        const lunas = docs.filter((d) => d.status === "Lunas");
        setTotalLunas(lunas.length);
        setTotalBulan(docs.length);
        setTotalIuran(lunas.reduce((s, d) => s + d.jumlah, 0));
      },
    ));

    // Pengumuman aktif
    unsubs.push(onSnapshot(
      query(collection(db, COLL.pengumuman), where("status", "==", "Aktif")),
      (snap) => {
        setPengAktif(snap.size);
        setPengList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PengumumanDoc)));
      },
    ));

    // Transaksi → saldo & chart
    unsubs.push(onSnapshot(
      query(collection(db, COLL.transaksi), orderBy("tanggal", "desc")),
      (snap) => {
        const all = snap.docs.map((d) => d.data());
        const total = all.reduce((s: number, d: any) => s + (d.jumlah ?? 0), 0);
        setSaldoKas(Math.max(0, total));

        // Build 6-month chart
        const months: Record<string, { pemasukan: number; pengeluaran: number }> = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleDateString("id-ID", { month: "short" });
          months[key] = { pemasukan: 0, pengeluaran: 0 };
        }
        all.forEach((d: any) => {
          if (!d.tanggal) return;
          const dt = new Date(d.tanggal);
          const key = dt.toLocaleDateString("id-ID", { month: "short" });
          if (months[key]) {
            if (d.jumlah > 0) months[key].pemasukan  += d.jumlah;
            else              months[key].pengeluaran += Math.abs(d.jumlah);
          }
        });
        setKeuangan(Object.entries(months).map(([bulan, v]) => ({ bulan, ...v })));
        setLoading(false);
      },
    ));

    // Aktivitas
    unsubs.push(onSnapshot(
      query(collection(db, COLL.aktivitas), orderBy("createdAt", "desc"), limit(8)),
      (snap) => setAktivitas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AktivitasDoc))),
    ));

    // Fallback timeout for loading
    const t = setTimeout(() => setLoading(false), 3000);
    return () => { unsubs.forEach((u) => u()); clearTimeout(t); };
  }, []);

  // Sync real data to localStorage so LandingPage can show live stats
  useEffect(() => {
    if (loading) return;

    const stats = {
      totalWarga,
      iuranLunas: totalLunas,
      iuranBulan: totalBulan,
      iuranTerkumpul: totalIuran,
      pengumumanAktif: pengAktif,
      bulan: new Date().toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      }),
    };

    //Tes debug
    console.log("SYNCING PUBLIC STATS", stats);

    // existing localStorage
    savePublicStats(stats);

    // new Firestore sync
    setDoc(
      doc(db, "public_stats", "current"),
      stats,
      { merge: true }
    ).catch(console.error);

  }, [
    loading,
    totalWarga,
    totalLunas,
    totalIuran,
    totalBulan,
    pengAktif,
  ]);

  if (loading) return <DashboardSkeleton />;

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const summaryCards = [
    {
      label: "Total Warga Aktif", value: `${totalWarga} KK`, suffix: "",
      icon: Users, trend: "Warga terverifikasi", trendUp: true,
      iconBg: "bg-blue-100", iconColor: "text-blue-600", trendBg: "bg-blue-50 text-blue-600",
    },
    {
      label: "Iuran Terkumpul", value: fmt(totalIuran), suffix: "",
      icon: CreditCard, trend: `${totalLunas}/${totalBulan || totalWarga} KK lunas`, trendUp: totalLunas > 0,
      iconBg: "bg-emerald-100", iconColor: "text-emerald-600", trendBg: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Pengumuman Aktif", value: pengAktif, suffix: "pengumuman",
      icon: Bell, trend: "Saat ini aktif", trendUp: false,
      iconBg: "bg-orange-100", iconColor: "text-orange-600", trendBg: "bg-orange-50 text-orange-600",
    },
    {
      label: "Saldo Kas RT", value: fmt(saldoKas), suffix: "",
      icon: Wallet, trend: "Total transaksi", trendUp: true,
      iconBg: "bg-purple-100", iconColor: "text-purple-600", trendBg: "bg-purple-50 text-purple-600",
    },
  ];

  const totalPemasukan  = keuangan.reduce((s, k) => s + k.pemasukan, 0);
  const totalPengeluaran = keuangan.reduce((s, k) => s + k.pengeluaran, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-r from-[#0F2744] to-blue-700 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-blue-900/20"
      >
        <div>
          <div className="text-blue-200 text-sm mb-1">{today} — RT 05 Kapasan Dalam, Surabaya</div>
          <h1 className="text-white text-xl sm:text-2xl font-bold">Selamat Datang, {rtInfo.ketua} 👋</h1>
          <p className="text-blue-300 text-sm mt-1">Ketua RT {rtInfo.rt} / RW {rtInfo.rw} — {rtInfo.kelurahan}, {rtInfo.kecamatan}, {rtInfo.kota}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setPage("surat")}
            className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm border border-white/20 transition-colors"
          >
            <FileText className="w-4 h-4" /> Buat Surat
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setPage("pengumuman")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-sm transition-colors"
          >
            <Bell className="w-4 h-4" /> Pengumuman
          </motion.button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: "easeOut" }}
              whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(15,39,68,0.1)" }}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm cursor-pointer hover:border-slate-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 ${card.iconBg} ${card.iconColor} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${card.trendBg}`}>
                  {card.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {card.trend}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-800 leading-none mb-1">{card.value}</div>
              <div className="text-slate-400 text-sm flex items-center gap-1">
                {card.label}
                {card.suffix && <span className="text-slate-300">• {card.suffix}</span>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Chart + Activities */}
      <div className="grid xl:grid-cols-3 gap-4">
        {/* Financial Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32 }}
          className="xl:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-800">Ringkasan Keuangan</h2>
              <p className="text-sm text-slate-400 mt-0.5">6 bulan terakhir</p>
            </div>
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Pemasukan</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-400" /> Pengeluaran</span>
            </div>
          </div>
          {keuangan.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-300 flex-col gap-2">
              <BarChart2 className="w-10 h-10" />
              <p className="text-sm">Belum ada data transaksi</p>
            </div>
          ) : (
            <CSSBarChart data={keuangan} />
          )}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
            {[
              { label: "Total Pemasukan",  value: fmt(totalPemasukan),               color: "text-blue-600"    },
              { label: "Total Pengeluaran",value: fmt(totalPengeluaran),              color: "text-rose-500"    },
              { label: "Saldo Bersih",     value: fmt(totalPemasukan - totalPengeluaran), color: "text-emerald-600" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={`font-bold ${s.color} text-sm`}>{s.value}</div>
                <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.42 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Aktivitas Terbaru</h2>
            <button onClick={() => setPage("aktivitas")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Lihat semua <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {aktivitas.length === 0 ? (
            <div className="py-8 text-center text-slate-300">
              <Activity className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Belum ada aktivitas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {aktivitas.slice(0, 6).map((act, i) => {
                const Icon = activityIconMap[act.ikon] || Activity;
                const color = activityColors[act.warna] || activityColors.gray;
                return (
                  <AnimListItem key={act.id ?? i} index={i}>
                    <div className="flex items-start gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 leading-snug">{act.aksi}</p>
                        <span className="text-xs text-slate-400">{act.waktu}</span>
                      </div>
                    </div>
                  </AnimListItem>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Iuran Status + Announcements */}
      <div className="grid xl:grid-cols-3 gap-4">
        {/* Iuran Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Status Iuran Bulan Ini</h2>
            <button onClick={() => setPage("iuran")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Detail <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {iuranList.length === 0 ? (
            <div className="py-6 text-center text-slate-300">
              <CreditCard className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Belum ada data iuran</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>{totalLunas} warga lunas</span>
                  <span>{totalBulan > 0 ? Math.round((totalLunas / totalBulan) * 100) : 0}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totalBulan > 0 ? (totalLunas / totalBulan) * 100 : 0}%` }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.6 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-xs mt-1.5">
                  <span className="text-emerald-600 font-medium">{totalLunas} Lunas</span>
                  <span className="text-red-500 font-medium">{totalBulan - totalLunas} Belum</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {iuranList.slice(0, 5).map((item, i) => (
                  <AnimListItem key={item.id ?? i} index={i}>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        {item.status === "Lunas"
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />}
                        <Avatar name={item.namaWarga} size="xs" />
                        <span className="text-sm text-slate-700 truncate">{item.namaWarga}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.status === "Lunas" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </AnimListItem>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Recent Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.58 }}
          className="xl:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Pengumuman Terbaru</h2>
            <button onClick={() => setPage("pengumuman")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Lihat semua <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {pengList.length === 0 ? (
            <div className="py-6 text-center text-slate-300">
              <Bell className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Belum ada pengumuman</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pengList.slice(0, 4).map((p, i) => (
                <AnimListItem key={p.id ?? i} index={i}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex gap-4 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors cursor-pointer"
                  >
                    <div className={`w-2 rounded-full flex-shrink-0 ${
                      p.prioritas === "Tinggi" ? "bg-red-400" :
                      p.prioritas === "Normal" ? "bg-blue-400" : "bg-slate-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-slate-800 truncate">{p.judul}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          p.status === "Aktif" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}>{p.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{p.isi}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span>{p.tanggal}</span>
                        <span>•</span>
                        <span>{p.penulis}</span>
                      </div>
                    </div>
                  </motion.div>
                </AnimListItem>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.65 }}
        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
      >
        <h2 className="font-semibold text-slate-800 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Tambah Warga",  icon: UserPlus,   color: "bg-blue-50    text-blue-600    hover:bg-blue-100    hover:shadow-md hover:shadow-blue-100",    page: "warga"      as Page },
            { label: "Catat Iuran",   icon: CreditCard, color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:shadow-md hover:shadow-emerald-100",  page: "iuran"      as Page },
            { label: "Buat Surat",    icon: FileText,   color: "bg-purple-50  text-purple-600  hover:bg-purple-100  hover:shadow-md hover:shadow-purple-100",   page: "surat"      as Page },
            { label: "Pengumuman",    icon: Bell,       color: "bg-orange-50  text-orange-600  hover:bg-orange-100  hover:shadow-md hover:shadow-orange-100",   page: "pengumuman" as Page },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.7 + i * 0.06 }}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setPage(action.page)}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl ${action.color} transition-all`}
              >
                <div className="w-11 h-11 rounded-xl bg-white/60 flex items-center justify-center shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

    </div>
  );
}

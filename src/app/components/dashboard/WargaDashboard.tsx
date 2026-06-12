/**
 * WargaDashboard — Warga portal with:
 *  - Real Firebase data (no dummy)
 *  - Surat Saya + Template Surat downloads from Firestore
 *  - Midtrans Snap payment (in WargaIuran)
 *  - Real-time iuran status
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  FileText,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Info,
  CreditCard,
  Calendar,
  ChevronRight,
  Download,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  Loader2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  increment,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { getSession, logoutUser, type AuthUser } from "../../../auth";
import {
  rtInfo,
  COLL,
  type PengumumanDoc,
  type IuranDoc,
  type SuratDoc,
  type TemplateDoc,
} from "./data";
import { ToastContainer, showToast, AnimListItem, cn, Spinner } from "./ui";
import { WargaIuran } from "./WargaIuran";
import { WargaJanjiTemu } from "./WargaJanjiTemu";

type WargaPage =
  | "beranda"
  | "pengumuman"
  | "iuran"
  | "janji"
  | "surat"
  | "profil";

const navItems: { id: WargaPage; label: string; icon: React.ElementType }[] = [
  { id: "beranda", label: "Beranda", icon: Home },
  { id: "pengumuman", label: "Pengumuman", icon: Bell },
  { id: "iuran", label: "Iuran Saya", icon: CreditCard },
  { id: "janji", label: "Janji Temu", icon: Calendar },
  { id: "surat", label: "Surat", icon: FileText },
  { id: "profil", label: "Profil Saya", icon: User },
];

// ─── Warga Beranda ────────────────────────────────────────────────────────────
function WargaBeranda({
  user,
  setPage,
}: {
  user: AuthUser;
  setPage: (p: WargaPage) => void;
}) {
  const [pengumuman, setPengumuman] = useState<
    (PengumumanDoc & { id: string })[]
  >([]);
  const [iuranStatus, setIuranStatus] = useState<
    (IuranDoc & { id: string }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const bulanIni = new Date().toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        query(
          collection(db, COLL.pengumuman),
          where("status", "==", "Aktif"),
          orderBy("createdAt", "desc"),
        ),
        (snap) => {
          setPengumuman(
            snap.docs.map(
              (d) =>
                ({ id: d.id, ...d.data() }) as PengumumanDoc & { id: string },
            ),
          );
          setLoading(false);
        },
        () => setLoading(false),
      ),
    );

    // Current user's iuran this month (by userId or name)
    unsubs.push(
      onSnapshot(
        query(
          collection(db, COLL.iuran),
          where("userId", "==", user.uid),
          where("bulan", "==", bulanIni),
        ),
        (snap) => {
          if (!snap.empty) {
            setIuranStatus({
              id: snap.docs[0].id,
              ...snap.docs[0].data(),
            } as IuranDoc & { id: string });
          } else {
            setIuranStatus(null);
          }
        },
      ),
    );

    const t = setTimeout(() => setLoading(false), 4000);
    return () => {
      unsubs.forEach((u) => u());
      clearTimeout(t);
    };
  }, [user.name, bulanIni]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#0F2744] to-blue-700 rounded-2xl p-5 sm:p-6 shadow-lg shadow-blue-900/20"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 border border-white/30">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-blue-200 text-xs mb-0.5">Selamat datang,</p>
            <h1 className="text-white font-bold text-lg leading-snug truncate">
              {user.name}
            </h1>
            <span className="inline-flex items-center gap-1.5 mt-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-3 py-0.5 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Warga RT {rtInfo.rt}
            </span>
          </div>
        </div>
        <p className="text-blue-300 text-xs mt-3">
          RT {rtInfo.rt} / RW {rtInfo.rw} — Kel. {rtInfo.kelurahan}, Kec.{" "}
          {rtInfo.kecamatan}, {rtInfo.kota}
        </p>
      </motion.div>

      {/* Iuran status card */}
      {iuranStatus && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-4 p-4 rounded-2xl border ${
            iuranStatus.status === "Lunas"
              ? "bg-emerald-50 border-emerald-200"
              : "bg-orange-50 border-orange-200"
          }`}
        >
          {iuranStatus.status === "Lunas" ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
          ) : (
            <Clock className="w-8 h-8 text-orange-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p
              className={`font-semibold text-sm ${iuranStatus.status === "Lunas" ? "text-emerald-700" : "text-orange-700"}`}
            >
              Iuran {bulanIni}: {iuranStatus.status}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {iuranStatus.status === "Lunas"
                ? `Dibayar: ${iuranStatus.tanggal ?? "—"}${iuranStatus.paymentMethod ? ` · via ${iuranStatus.paymentMethod}` : ""}`
                : `Segera selesaikan pembayaran ${fmt(iuranStatus.jumlah)}`}
            </p>
          </div>
          <button
            onClick={() => setPage("iuran")}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-shrink-0"
          >
            Bayar <ChevronRight className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {/* Quick Service Cards */}
      <div>
        <h2 className="font-semibold text-slate-700 mb-3">Layanan Warga</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Pengumuman",
              icon: Bell,
              page: "pengumuman" as WargaPage,
              bg: "bg-orange-50  text-orange-600  hover:bg-orange-100",
              count: pengumuman.length,
            },
            {
              label: "Iuran Saya",
              icon: CreditCard,
              page: "iuran" as WargaPage,
              bg: "bg-blue-50    text-blue-600    hover:bg-blue-100",
              count: null,
            },
            {
              label: "Janji Temu",
              icon: Calendar,
              page: "janji" as WargaPage,
              bg: "bg-violet-50  text-violet-600  hover:bg-violet-100",
              count: null,
            },
            {
              label: "Surat & Template",
              icon: FileText,
              page: "surat" as WargaPage,
              bg: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
              count: null,
            },
            {
              label: "Profil Saya",
              icon: User,
              page: "profil" as WargaPage,
              bg: "bg-slate-50   text-slate-600   hover:bg-slate-100",
              count: null,
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setPage(item.page)}
                className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl ${item.bg} transition-all text-center`}
              >
                {item.count !== null && item.count > 0 && (
                  <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {item.count}
                  </span>
                )}
                <div className="w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Recent Announcements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700">Pengumuman Terbaru</h2>
          <button
            onClick={() => setPage("pengumuman")}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            Lihat semua <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="p-6 text-center bg-white rounded-2xl border border-slate-100">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-slate-400 text-xs">Memuat pengumuman...</p>
          </div>
        ) : pengumuman.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-2xl border border-slate-100">
            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Belum ada pengumuman aktif</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pengumuman.slice(0, 3).map((p, i) => (
              <AnimListItem key={p.id} index={i}>
                <div className="bg-white rounded-xl border border-slate-100 p-3.5 flex gap-3 hover:border-blue-200 transition-colors">
                  <div
                    className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${p.prioritas === "Tinggi" ? "bg-red-400" : "bg-blue-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {p.judul}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.tanggal} · {p.penulis}
                    </p>
                  </div>
                  {p.prioritas === "Tinggi" && (
                    <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 h-fit">
                      Penting
                    </span>
                  )}
                </div>
              </AnimListItem>
            ))}
          </div>
        )}
      </div>

      {/* Contact RT */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-600" />
          <p className="text-sm font-semibold text-blue-800">
            Kontak RT 05 Kapasan Dalam
          </p>
        </div>
        <div className="space-y-1 text-xs text-blue-700">
          <p className="flex items-center gap-1.5">
            <User className="w-3 h-3" /> Ketua RT:{" "}
            <strong>{rtInfo.ketua}</strong>
          </p>
          <p className="flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> {rtInfo.noHP}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> {rtInfo.alamatKantor}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Warga Pengumuman ─────────────────────────────────────────────────────────
function WargaPengumuman() {
  const [items, setItems] = useState<(PengumumanDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, COLL.pengumuman),
      where("status", "==", "Aktif"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map(
            (d) =>
              ({ id: d.id, ...d.data() }) as PengumumanDoc & { id: string },
          ),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const aktif = items.filter((i) => i.status === "Aktif");

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Pengumuman RT 05</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {aktif.length} pengumuman aktif
        </p>
      </div>
      {loading ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Memuat pengumuman...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
          <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Belum ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p, i) => (
            <AnimListItem key={p.id} index={i}>
              <div
                className={`bg-white rounded-2xl border p-4 ${p.status === "Aktif" ? "border-slate-100" : "border-dashed border-slate-200 opacity-60"}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${p.prioritas === "Tinggi" ? "bg-red-400" : p.prioritas === "Normal" ? "bg-blue-400" : "bg-slate-300"}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-slate-800 text-sm leading-snug">
                        {p.judul}
                      </h3>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {p.prioritas === "Tinggi" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                            Penting
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.status === "Aktif" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2">
                      {p.isi}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{p.tanggal}</span>
                      <span>•</span>
                      <span>{p.penulis}</span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimListItem>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Warga Surat (Surat Saya + Template) ─────────────────────────────────────
function WargaSurat({ user }: { user: AuthUser }) {
  const [tab, setTab] = useState<"surat" | "template">("surat");
  const [suratList, setSuratList] = useState<(SuratDoc & { id: string })[]>([]);
  const [templateList, setTemplateList] = useState<
    (TemplateDoc & { id: string })[]
  >([]);
  const [loadingSurat, setLoadingSurat] = useState(true);
  const [loadingTempl, setLoadingTempl] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Fetch user's surat
  useEffect(() => {
    const q = query(
      collection(db, COLL.surat),
      where("pemohon", "==", user.name),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSuratList(
          snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as SuratDoc & { id: string },
          ),
        );
        setLoadingSurat(false);
      },
      () => setLoadingSurat(false),
    );
    return () => unsub();
  }, [user.name]);

  // Fetch active templates
  useEffect(() => {
    const q = query(
      collection(db, COLL.templates),
      where("aktif", "==", true),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        console.log("template count:", snap.size);

        setTemplateList(
          snap.docs.map(
            (d) =>
              ({
                id: d.id,
                ...d.data(),
              }) as TemplateDoc & { id: string },
          ),
        );

        setLoadingTempl(false);
      },
      (err) => {
        console.error("TEMPLATE ERROR:", err);
        setLoadingTempl(false);
      },
    );
    return () => unsub();
  }, []);

  const statusColor = (s: string) =>
    s === "Selesai"
      ? "bg-emerald-100 text-emerald-700"
      : s === "Diproses"
        ? "bg-blue-100    text-blue-700"
        : s === "Menunggu"
          ? "bg-orange-100  text-orange-700"
          : "bg-red-100     text-red-700";

  const statusIcon = (s: string) => (s === "Selesai" ? CheckCircle2 : Clock);

  const handleDownloadTemplate = async (t: TemplateDoc & { id: string }) => {
    if (!t.downloadUrl) return;
    setDownloading(t.id);
    try {
      window.open(t.downloadUrl, "_blank", "noopener,noreferrer");
      await updateDoc(doc(db, COLL.templates, t.id), { diunduh: increment(1) });
      showToast(`Template "${t.nama}" dibuka`, "success");
    } catch {
      showToast("Gagal membuka file.", "error");
    } finally {
      setTimeout(() => setDownloading(null), 800);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Surat</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Permohonan surat & template dokumen RT 05
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit">
        {[
          { id: "surat", label: "Surat Saya" },
          { id: "template", label: "Template Surat" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as "surat" | "template")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.id
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Surat Saya ──────────────────────────────── */}
      {tab === "surat" && (
        <div className="space-y-3">
          {loadingSurat ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Memuat surat...</p>
            </div>
          ) : suratList.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">
                Belum ada permohonan surat
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Kunjungi kantor RT atau hubungi pengurus untuk mengajukan surat
              </p>
              <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-600 text-left flex items-start gap-2">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Ketua RT: {rtInfo.ketua} · {rtInfo.noHP}
                </span>
              </div>
            </div>
          ) : (
            suratList.map((item, i) => {
              const StatusIcon = statusIcon(item.status);
              return (
                <AnimListItem key={item.id} index={i}>
                  <div
                    className={cn(
                      "bg-white rounded-2xl border p-4 transition-all",
                      item.status === "Selesai"
                        ? "border-emerald-200"
                        : item.status === "Menunggu"
                          ? "border-orange-200"
                          : "border-slate-100",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          item.status === "Selesai"
                            ? "bg-emerald-100"
                            : item.status === "Diproses"
                              ? "bg-blue-100"
                              : item.status === "Menunggu"
                                ? "bg-orange-100"
                                : "bg-red-100",
                        )}
                      >
                        <StatusIcon
                          className={cn(
                            "w-5 h-5",
                            item.status === "Selesai"
                              ? "text-emerald-600"
                              : item.status === "Diproses"
                                ? "text-blue-600"
                                : item.status === "Menunggu"
                                  ? "text-orange-500"
                                  : "text-red-500",
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {item.jenis}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {item.noSurat} · {item.tanggal}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0",
                              statusColor(item.status),
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        {item.catatan && (
                          <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2">
                            {item.catatan}
                          </p>
                        )}
                        {item.downloadUrl && item.status === "Selesai" && (
                          <a
                            href={item.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors w-full justify-center"
                          >
                            <Download className="w-4 h-4" />
                            Download Surat
                            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                          </a>
                        )}
                        {item.status === "Selesai" && !item.downloadUrl && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            File belum tersedia. Hubungi pengurus RT untuk
                            mendapatkan surat.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimListItem>
              );
            })
          )}
        </div>
      )}

      {/* ── Template Surat ──────────────────────────── */}
      {tab === "template" && (
        <div className="space-y-3">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Template Dokumen Resmi RT 05
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Unduh template, isi data yang diperlukan, lalu bawa ke pengurus
                RT untuk ditandatangani. Hubungi <strong>{rtInfo.ketua}</strong>{" "}
                di {rtInfo.noHP} jika ada pertanyaan.
              </p>
            </div>
          </div>

          {loadingTempl ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Memuat template...</p>
            </div>
          ) : templateList.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">
                Template belum tersedia
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Admin RT belum menambahkan template. Hubungi pengurus RT secara
                langsung.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {templateList.map((t, i) => (
                <AnimListItem key={t.id} index={i}>
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3 hover:border-blue-200 transition-colors">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {t.nama}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>{t.kategori}</span>
                        {t.ukuran && (
                          <>
                            <span>·</span>
                            <span>{t.ukuran}</span>
                          </>
                        )}
                      </div>
                      {t.deskripsi && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                          {t.deskripsi}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownloadTemplate(t)}
                      disabled={downloading === t.id || !t.downloadUrl}
                      title={
                        !t.downloadUrl
                          ? "File belum tersedia"
                          : "Unduh template"
                      }
                      className={cn(
                        "p-2 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0",
                        t.downloadUrl
                          ? "text-blue-600 hover:bg-blue-50"
                          : "text-slate-300 cursor-not-allowed",
                      )}
                    >
                      {downloading === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </AnimListItem>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Warga Profil ─────────────────────────────────────────────────────────────
function WargaProfil({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  const name = user?.name?.trim() || "";
  const email = user?.email?.trim() || "";
  const phone = user?.phone?.trim() || "";
  const address = user?.address?.trim() || "";
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const isIncomplete = !phone || !address;

  const fields = [
    { label: "Email", value: email, placeholder: "Belum diisi" },
    { label: "Telepon", value: phone, placeholder: "Belum diisi" },
    { label: "Alamat", value: address, placeholder: "Belum diisi" },
    {
      label: "RT/RW",
      value: `RT ${rtInfo.rt} / RW ${rtInfo.rw} — Kel. ${rtInfo.kelurahan}, ${rtInfo.kota}`,
      placeholder: "",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Profil Saya</h1>
        <p className="text-sm text-slate-400 mt-0.5">Informasi akun warga</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-5 pb-5 border-b border-slate-100 mb-5">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
            {name ? (
              <span className="text-white text-2xl font-bold">{initials}</span>
            ) : (
              <User className="w-8 h-8 text-white/80" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 text-lg leading-snug truncate">
              {name || (
                <span className="text-slate-400 font-normal italic">
                  Nama belum tersedia
                </span>
              )}
            </h2>
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Warga
              Aktif
            </span>
          </div>
        </div>

        {/* Incomplete data notice */}
        {isIncomplete && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700">
                Profil Belum Lengkap
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Beberapa informasi Anda masih kosong. Hubungi pengurus RT untuk
                memperbarui data.
              </p>
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="space-y-0">
          {fields.map(({ label, value, placeholder }) => (
            <div
              key={label}
              className="flex gap-4 py-3 border-b border-slate-50 last:border-0"
            >
              <span className="text-xs text-slate-400 w-20 flex-shrink-0 pt-0.5 font-medium">
                {label}
              </span>
              {value ? (
                <span className="text-sm text-slate-700 flex-1">{value}</span>
              ) : (
                <span className="text-sm text-slate-300 italic flex-1">
                  {placeholder}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* CTA to complete profile */}
        {isIncomplete && (
          <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
            <p className="text-sm text-blue-700 font-semibold mb-1">
              Lengkapi Profil Anda
            </p>
            <p className="text-xs text-blue-500">
              Hubungi pengurus RT 05 untuk melengkapi data nomor telepon dan
              alamat Anda.
            </p>
          </div>
        )}

        <button
          onClick={onLogout}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium border border-red-100"
        >
          <LogOut className="w-4 h-4" /> Keluar dari Akun
        </button>
      </div>
    </div>
  );
}

// ─── Main WargaDashboard ──────────────────────────────────────────────────────
export function WargaDashboard() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<WargaPage>("beranda");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate("/login", { replace: true });
      return;
    }
    if (session.role !== "Warga") {
      navigate("/dashboard", { replace: true });
      return;
    }
    setCurrentUser(session);
    setAuthChecked(true);
  }, [navigate]);

  const handleLogout = () => {
    logoutUser();
    showToast("Anda telah berhasil keluar. Sampai jumpa!", "success");
    setTimeout(() => navigate("/login", { replace: true }), 600);
  };

  const handleSetPage = (page: WargaPage) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  if (!authChecked || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-[#0F2744] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Home className="w-8 h-8 text-white" />
          </div>
          <Spinner size="lg" className="text-blue-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">
            Memverifikasi sesi...
          </p>
          <p className="text-slate-400 text-xs mt-1">
            SiMRT RT 05 Kapasan Dalam
          </p>
        </div>
      </div>
    );
  }

  const userInitials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const renderPage = () => {
    switch (activePage) {
      case "beranda":
        return <WargaBeranda user={currentUser} setPage={handleSetPage} />;
      case "pengumuman":
        return <WargaPengumuman />;
      case "iuran":
        return <WargaIuran user={currentUser} />;
      case "janji":
        return <WargaJanjiTemu user={currentUser} />;
      case "surat":
        return <WargaSurat user={currentUser} />;
      case "profil":
        return <WargaProfil user={currentUser} onLogout={handleLogout} />;
      default:
        return <WargaBeranda user={currentUser} setPage={handleSetPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <ToastContainer />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#0F2744] flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Home className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-base leading-none">
              {rtInfo.namaShort}
            </div>
            <div className="text-blue-300 text-[11px] mt-0.5 leading-none">
              Kel. {rtInfo.kelurahan}, {rtInfo.kota}
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleSetPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activePage === item.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "text-blue-200/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-3 flex-shrink-0 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {userInitials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold leading-none truncate">
                {currentUser.name}
              </div>
              <div className="text-blue-300 text-[10px] mt-0.5">
                Warga RT {rtInfo.rt}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-all"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 gap-4 shadow-sm">
          <button
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>RT 05 Kapasan Dalam</span>
              <span>/</span>
              <span className="text-slate-700 font-medium">
                {navItems.find((n) => n.id === activePage)?.label ?? "Beranda"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {userInitials}
              </span>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-slate-800 leading-none">
                {currentUser.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Warga RT {rtInfo.rt}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

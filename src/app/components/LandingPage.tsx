import { useNavigate } from "react-router";
import {
  Users, FileText, Bell, CreditCard,
  Phone, Mail, MapPin, Menu, X,
  ChevronRight, Shield, Clock, Smartphone,
  Home, Calendar, CheckCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getSession } from "../../auth";
import type { PublicStats } from "../lib/rtStats";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1693291757555-4c9d84d11c6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZWlnaGJvcmhvb2QlMjByZXNpZGVudGlhbCUyMGhvdXNlcyUyMEluZG9uZXNpYXxlbnwxfHx8fDE3NzczMDY0OTN8MA&ixlib=rb-4.1.0&q=80&w=1080";

const features = [
  {
    icon: Users,
    title: "Data Warga",
    description:
      "Kelola data warga RT 05 secara digital. Informasi warga lengkap dan mudah diakses kapan saja.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: CreditCard,
    title: "Iuran Bulanan",
    description:
      "Pantau pembayaran iuran Rp 25.000/KK secara real-time. Transparansi keuangan RT yang lebih baik.",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: FileText,
    title: "Surat Menyurat",
    description:
      "Ajukan surat administrasi — domisili, KTP, SKCK, dan lainnya — secara online tanpa antri.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: Bell,
    title: "Pengumuman",
    description:
      "Kerja bakti, rapat warga, jadwal ronda — semua informasi RT tersampai cepat ke seluruh warga.",
    color: "bg-orange-100 text-orange-600",
  },
];

const benefits = [
  {
    icon: Shield,
    title: "Aman & Terpercaya",
    description: "Data warga RT 05 dijaga dengan keamanan berlapis",
  },
  {
    icon: Clock,
    title: "Hemat Waktu",
    description: "Proses administrasi lebih cepat tanpa harus datang langsung",
  },
  {
    icon: Smartphone,
    title: "Akses Mudah",
    description: "Tersedia di semua perangkat — HP, tablet, maupun komputer",
  },
];


const layananList = [
  { icon: Users,    label: "Data Warga",       desc: "Pendataan & update informasi warga" },
  { icon: CreditCard, label: "Iuran Bulanan",  desc: "Pembayaran & rekap iuran RT" },
  { icon: FileText, label: "Surat Menyurat",    desc: "Pengajuan surat administrasi online" },
  { icon: Bell,     label: "Pengumuman",        desc: "Info kerja bakti, rapat, dan kegiatan" },
  { icon: Calendar, label: "Janji Temu",        desc: "Jadwal konsultasi dengan pengurus RT" },
  { icon: Home,     label: "Profil Warga",      desc: "Manajemen akun dan data diri" },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState<PublicStats | null>(null);

  const rtStats = [
    { value: stats?.totalWarga ? `${stats.totalWarga} KK` : "—", label: "Kepala Keluarga" },
    { value: "Rp 25rb", label: "Iuran per Bulan" },
    { value: "8+", label: "Jenis Layanan" },
    { value: "Sejak 2006", label: "Berdiri RT 05" },
  ];

  // Auto-redirect if already logged in
  useEffect(() => {
    const session = getSession();
    if (session) {
      navigate(session.role === "Admin" ? "/dashboard" : "/warga", { replace: true });
    }
  }, [navigate]);

  //
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "public_stats", "current"),
      (snap) => {
        console.log("PUBLIC STATS READ", snap.data());

        if (snap.exists()) {
          setStats(snap.data() as PublicStats);
        }
      },
      (err) => {
        console.error("PUBLIC STATS READ ERROR", err);
      }
    );

    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-blue-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-blue-700 font-bold text-base leading-none block">
                  SiMRT RT 05
                </span>
                <span className="text-blue-400 text-[11px] leading-none">
                  Kapasan Dalam, Surabaya
                </span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#layanan" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">
                Layanan
              </a>
              <a href="#tentang" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">
                Tentang
              </a>
              <a href="#kontak" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">
                Kontak
              </a>
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-all text-sm"
              >
                Masuk
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm text-sm"
              >
                Daftar Warga
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-blue-50"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-blue-100 px-4 py-4 flex flex-col gap-4">
            <a href="#layanan" className="text-gray-600 text-sm py-1" onClick={() => setMenuOpen(false)}>
              Layanan
            </a>
            <a href="#tentang" className="text-gray-600 text-sm py-1" onClick={() => setMenuOpen(false)}>
              Tentang
            </a>
            <a href="#kontak" className="text-gray-600 text-sm py-1" onClick={() => setMenuOpen(false)}>
              Kontak
            </a>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => navigate("/login")}
                className="flex-1 py-2 text-blue-600 border border-blue-300 rounded-lg text-sm"
              >
                Masuk
              </button>
              <button
                onClick={() => navigate("/register")}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Daftar
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-16 min-h-screen flex items-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Background decorations */}
        <div className="absolute top-20 right-0 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl -z-0" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl -z-0" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              {/* Location pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs mb-6 border border-blue-200">
                <MapPin className="w-3.5 h-3.5" />
                RT 05 / RW 03 — Kapasan Dalam, Semampir, Surabaya
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
                Sistem Informasi{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Manajemen RT 05
                </span>
                <br />
                <span className="text-gray-700">Kapasan Dalam</span>
              </h1>

              <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-lg">
                Portal digital resmi warga RT 05 Kapasan Dalam, Surabaya. Akses
                layanan administrasi, bayar iuran, dan pantau pengumuman RT — lebih
                mudah dan transparan.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <button
                  onClick={() => navigate("/login")}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-200"
                >
                  Masuk ke Portal
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 active:scale-95 transition-all"
                >
                  Daftar Sebagai Warga
                </button>
              </div>

              {/* RT 05 Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {rtStats.map((stat, i) => (
                  <div key={i} className="text-center bg-white/70 rounded-xl p-3 border border-blue-100">
                    <div className="text-lg font-bold text-blue-700">{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Image */}
            <div className="relative hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={HERO_IMAGE}
                  alt="RT 05 Kapasan Dalam"
                  className="w-full h-[480px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 to-transparent" />
              </div>

              {/* Floating card — Ketua RT (top-right) */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-blue-100">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">NI</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">Ibu Nanik Indahwati</div>
                  <div className="text-gray-400 text-xs">Ketua RT 05</div>
                </div>
              </div>

              {/* Floating card — Warga count (bottom-left) */}
              <div className="absolute -bottom-2 -left-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-blue-100">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">
                    {stats?.totalWarga ? `${stats.totalWarga} KK Warga` : "Warga RT 05"}
                  </div>
                  <div className="text-gray-400 text-xs">Terdaftar aktif</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Layanan Section */}
      <section id="layanan" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs mb-4 border border-blue-200">
              Layanan Digital RT 05
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Semua Kebutuhan Warga{" "}
              <span className="text-blue-600">dalam Satu Portal</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm">
              SiMRT RT 05 hadir untuk memudahkan warga Kapasan Dalam mengakses
              berbagai layanan administrasi RT secara digital.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-5 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300"
              >
                <div
                  className={`w-11 h-11 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Layanan list */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <h3 className="font-semibold text-blue-900 mb-4 text-sm text-center">
              Semua Fitur yang Tersedia di SiMRT RT 05
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {layananList.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-blue-100">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="tentang" className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Content */}
            <div className="text-white">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs mb-4 border border-white/30">
                Tentang RT 05 Kapasan Dalam
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-5">
                Administrasi RT yang{" "}
                <span className="text-blue-200">Lebih Mudah dan Transparan</span>
              </h2>
              <p className="text-blue-100 mb-6 leading-relaxed text-sm">
                RT 05 Kapasan Dalam, Kecamatan Semampir, Surabaya kini hadir dengan
                sistem informasi digital. Dipimpin oleh Ibu Nanik Indahwati selaku
                Ketua RT, sistem ini dirancang agar warga dapat mengakses layanan RT
                kapan saja tanpa harus datang langsung ke pengurus.
              </p>

              {/* Pengurus info */}
              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 mb-6">
                <p className="text-white/70 text-xs mb-3 uppercase tracking-wider font-semibold">Pengurus RT 05</p>
                <div className="space-y-2">
                  {[
                    { label: "Ketua RT", value: "Ibu Nanik Indahwati" },
                    { label: "Sekretaris", value: "Ibu Sumarni" },
                    { label: "Bendahara", value: "Bpk. Hartono" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-blue-200">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-white/10 rounded-xl border border-white/20">
                    <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm mb-0.5">{benefit.title}</div>
                      <div className="text-xs text-blue-200">{benefit.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats card */}
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-white">
                <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold mb-5">
                  Data RT 05 — {stats?.bulan ?? new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: stats?.totalWarga ? `${stats.totalWarga} KK` : "—", label: "Total Kepala Keluarga", icon: Users },
                    { value: "Rp 25rb", label: "Iuran per KK/bulan", icon: CreditCard },
                    { value: stats?.pengumumanAktif != null ? String(stats.pengumumanAktif) : "—", label: "Pengumuman Aktif", icon: Bell },
                    { value: "8+", label: "Template Surat", icon: FileText },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="bg-white/10 rounded-xl p-4 text-center">
                        <Icon className="w-5 h-5 text-blue-200 mx-auto mb-2" />
                        <div className="text-xl font-bold text-white">{item.value}</div>
                        <div className="text-xs text-blue-300 mt-0.5">{item.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-white">
                <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold mb-3">Iuran Terkini</p>
                {stats && stats.totalWarga > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-blue-100">{stats.bulan}</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        {stats.iuranLunas}/{stats.totalWarga} Lunas
                      </span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full"
                        style={{ width: `${Math.round((stats.iuranLunas / stats.totalWarga) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1.5">
                      <span className="text-emerald-300">{stats.iuranLunas} Lunas</span>
                      <span className="text-red-300">{stats.totalWarga - stats.iuranLunas} Belum Bayar</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-blue-200/70 text-sm py-3">
                    Data iuran belum tersedia
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Home className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Selamat Datang di{" "}
            <span className="text-blue-600">Portal Warga RT 05</span>
          </h2>
          <p className="text-gray-600 mb-8 text-sm max-w-xl mx-auto">
            Warga RT 05 Kapasan Dalam dapat mengakses seluruh layanan RT secara
            digital. Masuk menggunakan akun yang telah didaftarkan, atau daftar
            akun baru sebagai warga.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-200 text-sm"
            >
              Masuk ke Portal Warga
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-6 py-3 bg-white text-blue-600 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 active:scale-95 transition-all text-sm"
            >
              Daftar Akun Baru
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="kontak" className="bg-gray-900 text-white py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-white font-bold text-base leading-none block">SiMRT RT 05</span>
                  <span className="text-gray-400 text-[11px] leading-none">Kapasan Dalam, Surabaya</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Portal digital resmi RT 05 Kapasan Dalam, Kecamatan Semampir,
                Surabaya. Menghubungkan warga dan pengurus RT dalam satu sistem.
              </p>
            </div>

            {/* Layanan */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Layanan Tersedia</h4>
              <ul className="space-y-2">
                {["Data Warga", "Iuran Bulanan", "Surat Menyurat", "Pengumuman RT", "Janji Temu", "Template Surat"].map((item) => (
                  <li key={item}>
                    <span className="text-gray-400 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Kontak Pengurus RT 05</h4>
              <ul className="space-y-3">
                <li className="text-gray-400 text-sm">
                  <p className="text-gray-300 font-medium mb-0.5">Ibu Nanik Indahwati</p>
                  <p className="text-gray-500 text-xs">Ketua RT 05 Kapasan Dalam</p>
                </li>
                <li className="flex items-center gap-2 text-gray-400 text-sm">
                  <Phone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  0812-3311-7755
                </li>
                <li className="flex items-center gap-2 text-gray-400 text-sm">
                  <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  ketua@rt05kapasan.id
                </li>
                <li className="flex items-start gap-2 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  Jl. Kapasan Dalam No. 5, Semampir, Surabaya, Jawa Timur
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2026 SiMRT RT 05 Kapasan Dalam. Hak cipta dilindungi.
            </p>
            <p className="text-gray-600 text-xs">
              RT 05 / RW 03 — Kapasan Dalam, Semampir, Surabaya, Jawa Timur
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
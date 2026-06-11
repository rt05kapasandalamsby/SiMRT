/**
 * DashboardLayout — Admin shell for SiMRT RT 05.
 * Firebase-aware: reads session from localStorage (set during login).
 */

import { DashboardHome }   from "./DashboardHome";
import { DataWarga }       from "./DataWarga";
import { Iuran }           from "./Iuran";
import { Keuangan }        from "./Keuangan";
import { Surat }           from "./Surat";
import { Pengumuman }      from "./Pengumuman";
import { Aktivitas }       from "./Aktivitas";
import { JanjiTemu }       from "./JanjiTemu";
import { NotifikasiPage }  from "./NotifikasiPage";
import { Pengaturan }      from "./Pengaturan";
import { TemplateSurat }   from "./TemplateSurat";
import { ApprovalWarga }   from "./ApprovalWarga";

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard, Users, CreditCard, BarChart2, FileText, Bell,
  Activity, Calendar, Settings, LogOut, Menu, X, ChevronDown,
  Search, Home, UserCircle, AlertCircle, CheckCircle2, Info,
  ChevronRight, FolderDown, UserCheck, Loader2,
} from "lucide-react";

import { type Page, rtInfo } from "./data";
import { PageTransition, ToastContainer, showToast } from "./ui";
import { getSession, logoutUser, type AuthUser } from "../../../auth";

// ─── Nav config ───────────────────────────────────────────────────────────────
const navItems = [
  { id: "dashboard"  as Page, label: "Dashboard",       icon: LayoutDashboard },
  { id: "warga"      as Page, label: "Data Warga",      icon: Users           },
  { id: "approval"   as Page, label: "Approval Warga",  icon: UserCheck       },
  { id: "iuran"      as Page, label: "Iuran",           icon: CreditCard      },
  { id: "keuangan"   as Page, label: "Keuangan",        icon: BarChart2       },
  { id: "surat"      as Page, label: "Surat Menyurat",  icon: FileText        },
  { id: "template"   as Page, label: "Template Surat",  icon: FolderDown      },
  { id: "pengumuman" as Page, label: "Pengumuman",      icon: Bell            },
  { id: "aktivitas"  as Page, label: "Aktivitas",       icon: Activity        },
  { id: "janji"      as Page, label: "Janji Temu",      icon: Calendar        },
  { id: "notifikasi" as Page, label: "Notifikasi",      icon: Bell            },
  { id: "pengaturan" as Page, label: "Pengaturan",      icon: Settings        },
];

const pageTitles: Record<Page, string> = {
  dashboard:  "Dashboard",
  warga:      "Data Warga",
  approval:   "Approval Warga",
  iuran:      "Iuran Bulanan",
  keuangan:   "Keuangan",
  surat:      "Surat Menyurat",
  template:   "Template Surat",
  pengumuman: "Pengumuman",
  aktivitas:  "Riwayat Aktivitas",
  janji:      "Janji Temu",
  notifikasi: "Notifikasi",
  pengaturan: "Pengaturan",
};

function renderPage(page: Page, setPage: (p: Page) => void) {
  switch (page) {
    case "dashboard":  return <DashboardHome setPage={setPage} />;
    case "warga":      return <DataWarga />;
    case "approval":   return <ApprovalWarga />;
    case "iuran":      return <Iuran />;
    case "keuangan":   return <Keuangan />;
    case "surat":      return <Surat />;
    case "template":   return <TemplateSurat />;
    case "pengumuman": return <Pengumuman />;
    case "aktivitas":  return <Aktivitas />;
    case "janji":      return <JanjiTemu />;
    case "notifikasi": return <NotifikasiPage />;
    case "pengaturan": return <Pengaturan />;
    default:           return <DashboardHome setPage={setPage} />;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DashboardLayout() {
  const navigate = useNavigate();

  const [activePage,  setActivePage]  = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Auth guard
  useEffect(() => {
    const session = getSession();
    if (!session) { navigate("/login", { replace: true }); return; }
    if (session.role !== "Admin") { navigate("/warga", { replace: true }); return; }
    setCurrentUser(session);
    setAuthChecked(true);
  }, [navigate]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSetPage = (page: Page) => { setActivePage(page); setSidebarOpen(false); };
  const handleLogout  = () => {
    logoutUser();
    showToast("Anda telah berhasil keluar. Sampai jumpa!", "success");
    setTimeout(() => navigate("/login", { replace: true }), 600);
  };

  if (!authChecked || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-[#0F2744] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Home className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-7 h-7 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">Memverifikasi sesi...</p>
          <p className="text-slate-400 text-xs mt-1">SiMRT RT 05 Kapasan Dalam</p>
        </div>
      </div>
    );
  }

  const userInitials = currentUser.name
    .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <ToastContainer />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#0F2744] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Home className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-base leading-none">{rtInfo.namaShort}</div>
            <div className="text-blue-300 text-[11px] mt-0.5 leading-none truncate">
              {rtInfo.kelurahan}, {rtInfo.kota}
            </div>
          </div>
          <button className="ml-auto lg:hidden text-white/60 hover:text-white p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          {navItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              active={activePage === item.id}
              onClick={() => handleSetPage(item.id)}
            />
          ))}
        </nav>

        {/* Profile & Logout */}
        <div className="border-t border-white/10 px-3 py-3 flex-shrink-0 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold leading-none truncate">{currentUser.name}</div>
              <div className="text-blue-300 text-[10px] mt-0.5">Admin / Ketua RT {rtInfo.rt}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 gap-4 shadow-sm">
          <button className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>RT 05 Kapasan Dalam</span>
              <span>/</span>
              <span className="text-slate-700 font-medium">{pageTitles[activePage]}</span>
            </div>
          </div>

          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 w-52">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari..."
              className="bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none w-full"
            />
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{userInitials}</span>
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-slate-800 leading-none">{currentUser.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">Admin RT 05</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-100 z-50 overflow-hidden py-1">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-800">{currentUser.name}</div>
                  <div className="text-xs text-slate-400">{currentUser.email}</div>
                </div>
                <button
                  onClick={() => { handleSetPage("pengaturan"); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-slate-400" /> Profil Saya
                </button>
                <button
                  onClick={() => { handleSetPage("approval"); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-slate-400" /> Approval Warga
                </button>
                <div className="border-t border-slate-100 mt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <PageTransition pageKey={activePage}>
            {renderPage(activePage, handleSetPage)}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

// ─── Sidebar Item ─────────────────────────────────────────────────────────────
function SidebarItem({
  item, active, badge, onClick,
}: {
  item: { id: Page; label: string; icon: React.ElementType };
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
          : "text-blue-200/80 hover:text-white hover:bg-white/10"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  );
}

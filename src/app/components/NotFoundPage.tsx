import { useNavigate } from "react-router";
import { Home, LogIn } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Illustration */}
      <div className="w-52 h-52 mb-6 select-none" aria-hidden="true">
        <svg viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Ground shadow */}
          <ellipse cx="110" cy="195" rx="70" ry="10" fill="#CBD5E1" opacity="0.4" />

          {/* House body */}
          <rect x="55" y="105" width="110" height="85" rx="6" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="2.5" />

          {/* Roof */}
          <polygon points="42,108 110,50 178,108" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round" />

          {/* Door */}
          <rect x="87" y="145" width="36" height="45" rx="5" fill="#93C5FD" stroke="#3B82F6" strokeWidth="1.5" />
          <circle cx="118" cy="168" r="3.5" fill="#1D4ED8" />

          {/* Window left */}
          <rect x="63" y="120" width="28" height="22" rx="4" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="1.5" />
          <line x1="77" y1="120" x2="77" y2="142" stroke="#3B82F6" strokeWidth="1" />
          <line x1="63" y1="131" x2="91" y2="131" stroke="#3B82F6" strokeWidth="1" />

          {/* Window right */}
          <rect x="129" y="120" width="28" height="22" rx="4" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="1.5" />
          <line x1="143" y1="120" x2="143" y2="142" stroke="#3B82F6" strokeWidth="1" />
          <line x1="129" y1="131" x2="157" y2="131" stroke="#3B82F6" strokeWidth="1" />

          {/* Chimney */}
          <rect x="143" y="58" width="18" height="28" rx="3" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="2" />

          {/* Question mark bubble */}
          <circle cx="168" cy="48" r="30" fill="#FEF9C3" stroke="#F59E0B" strokeWidth="2.5" />
          <text x="168" y="58" textAnchor="middle" fontSize="30" fontWeight="bold" fill="#D97706" fontFamily="system-ui, sans-serif">?</text>

          {/* Path dots */}
          <circle cx="95"  cy="192" r="3" fill="#CBD5E1" />
          <circle cx="110" cy="196" r="3" fill="#CBD5E1" />
          <circle cx="125" cy="192" r="3" fill="#CBD5E1" />
        </svg>
      </div>

      {/* Badge */}
      <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        404
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-slate-800 mb-3 text-center">
        Halaman Tidak Ditemukan
      </h1>

      {/* Description */}
      <p className="text-slate-500 text-base leading-relaxed mb-8 text-center max-w-sm">
        Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-xs sm:max-w-none">
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0F2744] text-white rounded-xl font-medium hover:bg-blue-900 transition-all shadow-md shadow-blue-900/20 active:scale-95"
        >
          <Home className="w-4 h-4" />
          Kembali ke Beranda
        </button>
        <button
          onClick={() => navigate("/login")}
          className="flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-blue-700 border-2 border-blue-200 rounded-xl font-medium hover:bg-blue-50 transition-all active:scale-95"
        >
          <LogIn className="w-4 h-4" />
          Masuk ke Akun
        </button>
      </div>

      {/* Branding */}
      <div className="mt-14 flex items-center gap-2 text-slate-400">
        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-[#0F2744] rounded-lg flex items-center justify-center shadow-sm">
          <Home className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-medium">SiMRT RT 05 Kapasan Dalam</span>
      </div>
    </div>
  );
}

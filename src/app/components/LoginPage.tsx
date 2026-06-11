import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Eye, EyeOff, Mail, Lock,
  ArrowLeft, AlertCircle, Home, ShieldCheck, Loader2, CheckCircle2,
} from "lucide-react";
import { loginUser } from "../../auth";

export function LoginPage() {
  const navigate   = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      if (!result.success || !result.user) {
        setError(result.error ?? "Login gagal. Silakan coba lagi.");
        setLoading(false);
        return;
      }
      setSuccess(`Selamat datang, ${result.user.name}! Mengalihkan ke dashboard...`);
      const dest = result.user.role === "Admin" ? "/dashboard" : "/warga";
      setTimeout(() => navigate(dest, { replace: true }), 900);
    } catch {
      setError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      {/* Top bar */}
      <div className="p-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
            <Home className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-blue-700 font-bold text-sm block leading-none">SiMRT RT 05</span>
            <span className="text-blue-400 text-[10px] leading-none">Kapasan Dalam, Surabaya</span>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 border border-blue-100/80 overflow-hidden">

            {/* Card header */}
            <div className="bg-gradient-to-r from-[#0F2744] to-blue-700 px-8 py-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/30">
                  <Home className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">Portal Warga RT 05</h1>
                <p className="text-blue-200 text-sm">RT 05 Kapasan Dalam, Surabaya</p>
              </div>
            </div>

            {/* Card body */}
            <div className="px-8 py-8">

              {/* Info hint */}
              <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Informasi Login
                </div>
                <p className="text-blue-600">
                  Gunakan email dan kata sandi yang telah didaftarkan. Warga baru
                  harus mendaftar terlebih dahulu dan menunggu persetujuan admin.
                </p>
              </div>

              {/* Success */}
              {success && (
                <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                  {success}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder="email@contoh.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder="Masukkan kata sandi"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !!success}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {success ? (
                    <><CheckCircle2 className="w-4 h-4" /> Berhasil Masuk!</>
                  ) : loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Memverifikasi...</>
                  ) : (
                    "Masuk ke SiMRT"
                  )}
                </button>
              </form>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-500">
                  Belum punya akun?{" "}
                  <button
                    onClick={() => navigate("/register")}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Daftar sebagai Warga
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * RegisterPage — Warga only. After register, status = "pending" until Admin approves.
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Eye, EyeOff, Users, Mail, Lock, Phone, MapPin,
  User, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Clock,
} from "lucide-react";
import { registerUser } from "../../auth";

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName:        "",
    email:           "",
    phone:           "",
    address:         "",
    password:        "",
    confirmPassword: "",
  });
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading,             setLoading]             = useState(false);
  const [errors,              setErrors]              = useState<Record<string, string>>({});
  const [success,             setSuccess]             = useState(false);
  const [serverError,         setServerError]         = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field])  setErrors((prev) => ({ ...prev, [field]: "" }));
    if (serverError)    setServerError("");
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim())   e.fullName = "Nama lengkap wajib diisi";
    if (!form.email.trim())      e.email    = "Email wajib diisi";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Format email tidak valid";
    if (!form.phone.trim())      e.phone    = "Nomor telepon wajib diisi";
    else if (!/^[0-9+\-\s]{8,15}$/.test(form.phone)) e.phone = "Nomor telepon tidak valid";
    if (!form.address.trim())    e.address  = "Alamat wajib diisi";
    if (!form.password)          e.password = "Kata sandi wajib diisi";
    else if (form.password.length < 6) e.password = "Kata sandi minimal 6 karakter";
    if (!form.confirmPassword)   e.confirmPassword = "Konfirmasi kata sandi wajib diisi";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Kata sandi tidak cocok";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await registerUser({
        name:     form.fullName,
        email:    form.email,
        password: form.password,
        phone:    form.phone,
        address:  form.address,
      });
      if (!result.success) {
        setServerError(result.error ?? "Pendaftaran gagal. Silakan coba lagi.");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setServerError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 border border-blue-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Pendaftaran Terkirim!</h2>
          <p className="text-gray-500 mb-2">
            Akun untuk <span className="font-semibold text-gray-700">{form.fullName}</span> telah
            didaftarkan dan sedang menunggu persetujuan admin RT 05.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 my-5 text-left">
            <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm mb-1">
              <Clock className="w-4 h-4" /> Status: Menunggu Persetujuan
            </div>
            <p className="text-xs text-orange-600">
              Pengurus RT 05 akan meninjau pendaftaran Anda. Anda akan dapat login
              setelah akun disetujui. Hubungi <strong>0812-3311-7755</strong> untuk info lebih lanjut.
            </p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
          >
            Kembali ke Halaman Login
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full mt-3 py-3 text-gray-500 hover:text-blue-600 text-sm transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const inputClass = (field: string) =>
    `w-full pr-4 py-3 bg-gray-50 border rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-sm ${
      errors[field]
        ? "border-red-300 focus:ring-red-200 focus:border-red-400"
        : "border-gray-200 focus:ring-blue-300 focus:border-blue-400"
    }`;

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
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-blue-700 font-bold text-sm block leading-none">SiMRT RT 05</span>
            <span className="text-blue-400 text-[10px] leading-none">Kapasan Dalam, Surabaya</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 border border-blue-100/80 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/30">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">Daftar Sebagai Warga</h1>
                <p className="text-blue-200 text-sm">RT 05 Kapasan Dalam, Surabaya</p>
              </div>
            </div>

            {/* Info banner */}
            <div className="mx-8 mt-6 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-2 text-orange-700 text-xs">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Setelah daftar, akun Anda memerlukan <strong>persetujuan admin RT 05</strong> sebelum
                bisa digunakan. Proses biasanya 1–2 hari kerja.
              </p>
            </div>

            {/* Card Body */}
            <div className="px-8 py-6">
              {serverError && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {serverError}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nama Lengkap <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      placeholder="Masukkan nama lengkap"
                      className={`${inputClass("fullName")} pl-10`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Alamat Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="email@contoh.com"
                      className={`${inputClass("email")} pl-10`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nomor Telepon <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="0812-3456-7890"
                      className={`${inputClass("phone")} pl-10`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.phone}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Alamat Rumah <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                    <textarea
                      value={form.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="Jl. Kapasan Dalam No. ..., RT 05/RW 03"
                      rows={2}
                      className={`${inputClass("address")} pl-10 resize-none`}
                    />
                  </div>
                  {errors.address && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.address}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Kata Sandi <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className={`${inputClass("password")} pl-10 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Konfirmasi Kata Sandi <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      placeholder="Ulangi kata sandi"
                      className={`${inputClass("confirmPassword")} pl-10 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.confirmPassword}
                    </p>
                  )}
                  {!errors.confirmPassword && form.confirmPassword && form.password === form.confirmPassword && (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Kata sandi cocok
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 flex items-center justify-center gap-2 mt-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mendaftarkan...
                    </>
                  ) : (
                    "Daftar Sebagai Warga"
                  )}
                </button>
              </form>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-500">
                  Sudah punya akun?{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Masuk di sini
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

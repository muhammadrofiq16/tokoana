"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal masuk ke sistem.");
        setLoading(false);
        return;
      }

      router.push(data.redirect || "/dashboard");
      router.refresh();
    } catch {
      setError("Koneksi gagal. Silakan periksa jaringan dan coba lagi.");
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string) => {
    setEmail(userEmail);
    setPassword("password");
    setError(null);
  };

  return (
    <div className="bg-slate-50 text-slate-800 antialiased min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements matching original app */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-lg shadow-brand-500/20 mb-3">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">TOKO ANA</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            SIKOL POS &bull; Sistem Informasi Kasir &amp; Inventaris Toko
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl p-7 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@toko.com"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
                />
                <span className="text-xs font-medium text-slate-600">Ingat perangkat ini</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-dark hover:bg-brand-800 active:bg-brand-900 text-white font-bold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg shadow-brand-700/20 transition-all flex items-center justify-center gap-2 text-sm mt-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? "Memproses..." : "Masuk ke Sistem"}</span>
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Pilihan Akun Cepat</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("admin@toko.com")}
                className="p-2 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 text-left transition-all"
              >
                <div className="font-bold text-xs text-slate-800">Admin Toko</div>
                <div className="text-[10px] text-slate-500 truncate">admin@toko.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("kasir@toko.com")}
                className="p-2 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 text-left transition-all"
              >
                <div className="font-bold text-xs text-slate-800">Kasir 1</div>
                <div className="text-[10px] text-slate-500 truncate">kasir@toko.com</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Notice */}
        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          &copy; {new Date().getFullYear()} Toko Ana. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </div>
  );
}

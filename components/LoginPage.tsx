import React, { useState } from "react";

interface LoginPageProps {
  onLoginSuccess: (password: string) => void;
  gasUrl: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, gasUrl }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMessage("Silakan masukkan kata sandi terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const cacheBuster = `t=${Date.now()}`;
      const url = `${gasUrl}?action=check_password&password=${encodeURIComponent(trimmed)}&${cacheBuster}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }

      const result = await res.json();

      // Verifikasi respon otentikasi
      if (typeof result.valid === "boolean") {
        if (result.valid) {
          onLoginSuccess(trimmed);
        } else {
          setErrorMessage(
            result.message || "Kata sandi salah! Pastikan kata sandi otorisasi yang Anda masukkan sudah benar."
          );
        }
        return;
      }

      // Format fallback
      if (result.status === "success" && Array.isArray(result.data)) {
        onLoginSuccess(trimmed);
        return;
      }

      if (result.status === "error") {
        setErrorMessage(result.message || "Terjadi kendala saat memverifikasi sandi ke Server Basis Data.");
      } else {
        setErrorMessage("Format respon server tidak dikenali. Silakan hubungi administrator.");
      }
    } catch (err: any) {
      console.error("Login verification error:", err);
      setErrorMessage(
        "Gagal terhubung ke Server Basis Data. Periksa koneksi internet Anda atau hubungi administrator sistem."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header Visual */}
        <div className="bg-gradient-to-br from-red-600 via-rose-600 to-red-700 p-8 text-center text-white relative">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
            Akses Terbatas Petugas
          </span>
          <h1 className="text-xl font-black uppercase tracking-tight leading-snug">
            Pendataan KTP Warga
            <br />
            <span className="text-red-200">Pematang Tahalo</span>
          </h1>
          <p className="text-xs text-red-100/90 mt-2 font-medium">
            Masukkan kata sandi otorisasi petugas untuk masuk
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-2">
                Kata Sandi Petugas
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik sandi Anda..."
                  disabled={isLoading}
                  autoFocus
                  className="w-full px-4 py-3.5 pr-12 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 leading-relaxed space-y-2">
                <p className="font-semibold">{errorMessage}</p>
                <p className="text-[11px] text-red-600">
                  Pastikan kata sandi yang Anda masukkan sudah terdaftar di sistem otorisasi petugas.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-red-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memeriksa Sandi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Aplikasi</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Security Badge - Completely Hidden Settings */}
          <div className="pt-4 border-t border-gray-100 text-center">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 text-slate-500 rounded-full text-[10px] font-semibold border border-slate-200/60">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Sistem Pangkalan Data Terenkripsi & Terlindungi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

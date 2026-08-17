import React, { useState } from "react";
import { Lock, Mail, KeyRound, Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export default function Login({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Supabase no está configurado. Revisa tu archivo .env (ver .env.example).");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : authError.message);
      return;
    }
    onAuthed(data.session);
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-xl ring-1 ring-slate-200/70">
        {/* Cabecera con degradado azul/turquesa */}
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-400">
          {/* recortes diagonales decorativos */}
          <div
            className="absolute -right-10 -top-10 h-40 w-40 bg-white/10"
            style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
          />
          <div
            className="absolute -bottom-16 -left-10 h-44 w-52 bg-cyan-300/25"
            style={{ clipPath: "polygon(0 100%, 0 0, 100% 100%)" }}
          />
          <div
            className="absolute bottom-0 right-0 h-24 w-40 bg-blue-900/20"
            style={{ clipPath: "polygon(100% 100%, 100% 0, 0 100%)" }}
          />

          <p className="relative z-10 pt-5 text-center text-[11px] font-medium uppercase tracking-wider text-white/70">
            Centro Administrativo
          </p>
          <h1 className="relative z-10 mt-1 text-center text-2xl font-semibold text-white drop-shadow-sm">
            Bienvenida, Nairobi
          </h1>
        </div>

        {/* Avatar/logo superpuesto entre cabecera y formulario */}
        <div className="relative -mt-12 flex justify-center">
          <div className="h-24 w-24 rounded-2xl bg-white p-1.5 shadow-lg ring-4 ring-white">
            <img
              src="/branding/logo_nairobi_montilla.png"
              alt="Nairobi Montilla — Corredor de Seguros"
              className="h-full w-full rounded-xl object-cover"
            />
          </div>
        </div>

        <div className="px-7 pb-7 pt-3 text-center">
          <p className="text-sm font-semibold text-slate-700">Nairobi OS</p>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-400">
            <Lock size={12} /> Acceso privado — solo personal autorizado
          </p>

          {!isSupabaseConfigured && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-left text-xs text-amber-700 ring-1 ring-amber-200">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Falta configurar Supabase. Copia <code className="rounded bg-amber-100 px-1">.env.example</code> a <code className="rounded bg-amber-100 px-1">.env</code> con tu URL y anon key.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-left">
            <div className="group flex items-center gap-2 border-b border-slate-200 pb-2 transition focus-within:border-blue-500">
              <Mail size={16} className="text-slate-400 transition group-focus-within:text-blue-500" />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@agencia.com"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="group flex items-center gap-2 border-b border-slate-200 pb-2 transition focus-within:border-blue-500">
              <KeyRound size={16} className="text-slate-400 transition group-focus-within:text-blue-500" />
              <input
                type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-slate-400 transition hover:text-blue-500"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:from-blue-800 hover:via-blue-700 hover:to-cyan-600 disabled:opacity-60"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Iniciar sesión
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] text-slate-400">
            Los usuarios se crean desde el panel de Supabase (Authentication → Users) de tu proyecto. No hay registro público.
          </p>
        </div>
      </div>
    </div>
  );
}

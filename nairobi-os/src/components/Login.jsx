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
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-72 -left-72 h-[620px] w-[620px] rotate-45 bg-gradient-to-br from-blue-700 to-blue-400 opacity-90" />
        <div className="absolute -bottom-72 -right-72 h-[620px] w-[620px] rotate-45 bg-gradient-to-tr from-blue-900 to-blue-600 opacity-90" />
        <div className="absolute inset-0 bg-white/50" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200/70">
          <div className="relative flex flex-col items-center bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 pb-14 pt-10 text-center text-white">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-white shadow-lg ring-4 ring-white/30">
              <img src="/branding/logo_nairobi_montilla.png" alt="Nairobi Montilla" className="h-full w-full object-cover" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Bienvenida Nairobi</h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-blue-100">Corredor de Seguros · Centro Administrativo</p>
          </div>

          <div className="-mt-8 rounded-t-3xl bg-white px-7 pb-7 pt-6">
            <p className="mb-4 flex items-center justify-center gap-1 text-xs text-slate-400">
              <Lock size={12} /> Acceso privado — solo personal autorizado
            </p>

            {!isSupabaseConfigured && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Falta configurar Supabase. Copia <code className="rounded bg-amber-100 px-1">.env.example</code> a <code className="rounded bg-amber-100 px-1">.env</code> con tu URL y anon key.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
                <Mail size={15} className="text-blue-500" />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@agencia.com"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
                <KeyRound size={15} className="text-blue-500" />
                <input
                  type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 text-slate-400 transition hover:text-blue-500 focus:outline-none"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-60"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Iniciar sesión
              </button>
            </form>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-400">
          Los usuarios se crean desde el panel de Supabase (Authentication → Users) de tu proyecto. No hay registro público.
        </p>
      </div>
    </div>
  );
}

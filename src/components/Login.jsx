import React, { useState } from "react";
import { Lock, Mail, KeyRound, Loader2, AlertTriangle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export default function Login({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 ring-1 ring-slate-200/70 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold shadow-sm">N</div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Centro Administrativo</p>
          <h1 className="text-lg font-semibold text-slate-800">Nairobi OS</h1>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Lock size={12} /> Acceso privado — solo personal autorizado</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Falta configurar Supabase. Copia <code className="rounded bg-amber-100 px-1">.env.example</code> a <code className="rounded bg-amber-100 px-1">.env</code> con tu URL y anon key.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
            <Mail size={15} className="text-slate-400" />
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@agencia.com"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
            <KeyRound size={15} className="text-slate-400" />
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
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
  );
}

import React, { useState } from "react";
import { Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { Sello } from "./comunes.jsx";

export default function Login({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function entrar(e) {
    e.preventDefault();
    if (!isSupabaseConfigured) { setError("La app no tiene configurada la conexión (falta el archivo .env)."); return; }
    setCargando(true); setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setCargando(false);
    if (err) { setError(err.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : err.message); return; }
    onAuthed(data.session);
  }

  return (
    <main className="login">
      <form className="login-caja" onSubmit={entrar}>
        <Sello texto="Cobros con Noe · Nairobi Montilla · " />
        <h1>Bienvenida, Nairobi</h1>
        <p>Sus cobros, en un solo lugar.</p>
        <label className="solo-lector" htmlFor="correo">Correo</label>
        <input id="correo" className="entrada" type="email" autoComplete="email" required placeholder="Correo"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="pass">
          <label className="solo-lector" htmlFor="clave">Contraseña</label>
          <input id="clave" className="entrada" type={ver ? "text" : "password"} autoComplete="current-password" required placeholder="Contraseña"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar contraseña" : "Ver contraseña"}>
            {ver ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        {error && <div className="aviso error" role="alert" style={{ margin: "0 0 10px" }}><AlertTriangle size={18} style={{ flex: "none", marginTop: 2 }} />{error}</div>}
        <button type="submit" className="boton ancho laton" disabled={cargando} style={{ marginTop: 6 }}>
          {cargando ? <Loader2 size={19} className="girando" /> : "Entrar"}
        </button>
      </form>
    </main>
  );
}

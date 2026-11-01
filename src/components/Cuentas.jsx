import React, { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, AlertTriangle, Check } from "lucide-react";
import { FormCuenta } from "./Cobrar.jsx";
import * as api from "../lib/api.js";
import { TIPOS_CUENTA, nombreCuenta, lineasCuenta, nuevaClave } from "../lib/formato.js";

const VACIA = { tipo: "pago_movil", alias: "", banco: "", titular: "", documento: "", numero: "", telefono: "", correo: "", detalle: "" };

export default function Cuentas({ cuentas, setCuentas }) {
  const [editando, setEditando] = useState(null); // {…cuenta} | null
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState("");

  async function guardar(lista, aviso) {
    setGuardando(true); setError("");
    try { await api.guardarCuentas(lista); setCuentas(lista); setEditando(null); setHecho(aviso); setTimeout(() => setHecho(""), 2600); }
    catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  }

  function guardarEdicion() {
    const c = { ...editando, id: editando.id || `c-${nuevaClave().slice(0, 8)}` };
    const existe = cuentas.some((x) => x.id === c.id);
    guardar(existe ? cuentas.map((x) => (x.id === c.id ? c : x)) : [c, ...cuentas], existe ? "Cuenta actualizada" : "Cuenta guardada");
  }

  return (
    <section className="vista" aria-labelledby="t-cuentas">
      <h1 className="titulo" id="t-cuentas">Mis cuentas</h1>
      <p className="bajada">Las cuentas a las que le pagan. La última que usó en un cobro queda de primera.</p>
      {hecho && <div className="aviso ok" role="status" style={{ marginBottom: 12 }}><Check size={18} />{hecho}</div>}
      {error && <div className="aviso error" role="alert" style={{ marginBottom: 12 }}><AlertTriangle size={18} />{error}</div>}

      {editando ? (
        <div className="paso">
          <div className="paso-cab"><h2 className="paso-tit">{editando.id ? "Editar cuenta" : "Cuenta nueva"}</h2></div>
          <FormCuenta valor={editando} onCambio={setEditando} />
          <div className="acciones" style={{ marginTop: 6 }}>
            <button type="button" className="boton chico suave" onClick={() => setEditando(null)}>Cancelar</button>
            <button type="button" className="boton chico" onClick={guardarEdicion} disabled={guardando}>
              {guardando ? <Loader2 size={16} className="girando" /> : <Check size={16} />} Guardar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="boton ancho borde" style={{ marginBottom: 14 }} onClick={() => setEditando({ ...VACIA })}>
          <Plus size={18} /> Agregar una cuenta
        </button>
      )}

      <div className="lista-cuentas">
        {cuentas.map((c, i) => (
          <div key={c.id} className="cuenta" style={{ animation: `aparece .45s var(--sale) ${i * 50}ms both` }}>
            <span className="tipo">{TIPOS_CUENTA.find((t) => t.id === c.tipo)?.label}{i === 0 && c.usado ? " · la más usada" : ""}</span>
            <span className="alias">{nombreCuenta(c)}</span>
            <span className="lineas">{lineasCuenta(c).slice(1).map((l, k) => <span key={k} style={{ display: "block" }}>{l}</span>)}</span>
            <span className="acc">
              <button type="button" onClick={() => setEditando({ ...VACIA, ...c })}><Pencil size={14} /> Editar</button>
              <button type="button" disabled={guardando} onClick={() => {
                if (window.confirm(`¿Quitar «${nombreCuenta(c)}» de sus cuentas?`)) guardar(cuentas.filter((x) => x.id !== c.id), "Cuenta quitada");
              }}><Trash2 size={14} /> Quitar</button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

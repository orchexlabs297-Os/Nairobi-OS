import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Loader2, MessagesSquare, SendHorizontal, AlertTriangle } from "lucide-react";
import { Inicial, Vacio } from "./comunes.jsx";
import * as api from "../lib/api.js";
import { telefonoLegible, horaLegible, diaClave, nombreDia, fechaCorta } from "../lib/formato.js";

const VISTO = "nairobi-respuestas-visto";

function leerVisto() {
  try { return JSON.parse(localStorage.getItem(VISTO) || "{}"); } catch { return {}; }
}

export default function Respuestas({ convs, cargando, error, recargar, abrirTelefono, limpiarAbrir }) {
  const [abierta, setAbierta] = useState(null);
  const [visto, setVisto] = useState(leerVisto);

  useEffect(() => {
    if (!abrirTelefono || !convs) return;
    const c = convs.find((x) => x.contacts?.phone === abrirTelefono);
    if (c) setAbierta(c.id);
    limpiarAbrir();
  }, [abrirTelefono, convs]); // eslint-disable-line react-hooks/exhaustive-deps

  function abrir(c) {
    const ult = c.messages.at(-1)?.id;
    const v = { ...visto, [c.id]: ult };
    setVisto(v);
    try { localStorage.setItem(VISTO, JSON.stringify(v)); } catch { /* sin almacenamiento: solo se pierde el «nuevo» */ }
    setAbierta(c.id);
  }

  const actual = convs?.find((c) => c.id === abierta);

  return (
    <section className="vista" aria-labelledby="t-resp">
      <h1 className="titulo" id="t-resp">Respuestas</h1>
      <p className="bajada">Lo que contestan las personas a las que les cobra. Aquí no aparecen sus chats personales.</p>
      {error && <div className="aviso error" role="alert"><AlertTriangle size={18} />{error} <button type="button" onClick={recargar}>Reintentar</button></div>}
      {cargando && !convs && <p className="ayuda"><Loader2 size={16} className="girando" /> Cargando…</p>}
      {convs && convs.length === 0 && (
        <Vacio icono={MessagesSquare} titulo="Sin respuestas todavía">Cuando alguien conteste un cobro, la conversación aparece aquí.</Vacio>
      )}
      {(convs || []).map((c, i) => {
        const ult = c.messages.at(-1);
        const nuevo = ult && ult.direction === "inbound" && visto[c.id] !== ult.id;
        const nombre = c.contacts?.name || telefonoLegible(c.contacts?.phone);
        return (
          <button key={c.id} type="button" className="conv" style={{ animationDelay: `${i * 40}ms` }} onClick={() => abrir(c)}>
            <Inicial nombre={nombre} />
            <span className="item-txt">
              <b>{nombre}</b>
              <small className={nuevo ? "nuevo" : ""}>{ult ? `${ult.direction === "inbound" ? "" : "Noe: "}${ult.message_text || "(archivo)"}` : "Sin mensajes"}</small>
            </span>
            <span className="item-der">
              {ult && <span className="hora" style={{ fontSize: 13, fontWeight: 400, color: "var(--texto-3)" }}>{cuandoCorto(ult.created_at)}</span>}
              {nuevo && <span className="punto-nuevo" style={{ display: "inline-block", marginTop: 6 }} aria-label="Respuesta nueva" />}
            </span>
          </button>
        );
      })}
      {/* Al body: la animación de entrada de la vista crearía otro marco y el chat no cubriría la pantalla. */}
      {actual && createPortal(<Chat conv={actual} onCerrar={() => setAbierta(null)} recargar={recargar} />, document.body)}
    </section>
  );
}

function cuandoCorto(iso) {
  const d = diaClave(iso);
  return d === diaClave(new Date()) ? horaLegible(iso) : fechaCorta(d);
}

function Chat({ conv, onCerrar, recargar }) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState("");
  const finRef = useRef(null);
  const phone = conv.contacts?.phone;
  const nombre = conv.contacts?.name || telefonoLegible(phone);

  useEffect(() => { finRef.current?.scrollIntoView({ block: "end" }); }, [conv.messages.length]);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onCerrar]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true); setError("");
    try { await api.enviarMensaje(phone, t); setTexto(""); await recargar(); } catch (e) { setError(e.message); } finally { setEnviando(false); }
  }

  async function alternarNoe() {
    setCambiando(true); setError("");
    try { await api.cambiarNoe(phone, !conv.should_respond); await recargar(); } catch (e) { setError(e.message); } finally { setCambiando(false); }
  }

  let diaPrevio = null;
  return (
    <div className="chat" role="dialog" aria-modal="true" aria-label={`Conversación con ${nombre}`}>
      <div className="chat-cab">
        <button type="button" className="atras" onClick={onCerrar} aria-label="Volver"><ArrowLeft size={22} /></button>
        <Inicial nombre={nombre} />
        <div><b>{nombre}</b><small>{telefonoLegible(phone)}</small></div>
      </div>
      <div className="chat-hilo">
        {conv.messages.map((m) => {
          const d = diaClave(m.created_at);
          const sep = d !== diaPrevio ? (diaPrevio = d) : null;
          const deNairobi = m.metadata?.sent_by === "nairobi";
          return (
            <React.Fragment key={m.id}>
              {sep && <p className="previa-para">{nombreDia(d)} {fechaCorta(d)}</p>}
              <div className={`msj ${m.direction === "inbound" ? "in" : "out"}`}>
                {m.direction !== "inbound" && <span className="quien">{deNairobi ? "Usted" : "Noe"}</span>}
                {m.message_text || "(foto o archivo)"}
                <span className="hora">{horaLegible(m.created_at)}</span>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={finRef} />
      </div>
      <div className="chat-pie">
        <div className="chat-noe">
          <span>{conv.should_respond ? "Noe responde en este chat" : "Noe está pausada en este chat"}</span>
          <button type="button" role="switch" aria-checked={!!conv.should_respond} className="interruptor" style={{ width: "auto", padding: 0 }}
            onClick={alternarNoe} disabled={cambiando} aria-label="Noe responde en este chat">
            <span className="pista" />
          </button>
        </div>
        {error && <div className="aviso error" role="alert" style={{ marginTop: 0, marginBottom: 8 }}><AlertTriangle size={18} />{error}</div>}
        <div className="chat-escribir">
          <textarea className="entrada" rows={1} value={texto} placeholder="Responder como Nairobi"
            onChange={(e) => { setTexto(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }} />
          <button type="button" className="boton" onClick={enviar} disabled={!texto.trim() || enviando} aria-label="Enviar">
            {enviando ? <Loader2 size={18} className="girando" /> : <SendHorizontal size={19} />}
          </button>
        </div>
      </div>
    </div>
  );
}

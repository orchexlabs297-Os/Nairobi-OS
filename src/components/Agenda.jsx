import React, { useMemo, useState } from "react";
import { BadgeCheck, CalendarClock, Loader2, MessageCircle, Send, X, CalendarX2, AlertTriangle } from "lucide-react";
import { Inicial, Vacio } from "./comunes.jsx";
import { TOPE_DIA, formatoWhatsapp } from "./Cobrar.jsx";
import * as api from "../lib/api.js";
import { diaClave, nombreDia, fechaCorta, horaLegible, telefonoLegible, sumarDias, aISO, etiquetaHora, horaCaracas } from "../lib/formato.js";

const ESTADO = { pending: "Programado", sent: "Enviado", skipped: "Cancelado", failed: "No salió", pagado: "Ya pagó" };

export default function Agenda({ items, cargando, error, recargar, carga, horario, verConversacion }) {
  const [filtro, setFiltro] = useState("proximos");
  const [abierto, setAbierto] = useState(null);

  const lista = useMemo(() => {
    const hoy = diaClave(new Date());
    return (items || [])
      .map((r) => {
        const cobro = r.contacts?.metadata?.cobros?.[r.window_key] || null;
        return { ...r, cobro, estado: cobro?.pagado ? "pagado" : r.status };
      })
      .filter((r) => filtro === "todos" ? true
        : filtro === "proximos" ? r.status === "pending" || diaClave(r.scheduled_for) >= hoy
        : ["sent", "pagado"].includes(r.estado));
  }, [items, filtro]);

  const grupos = useMemo(() => {
    const g = new Map();
    for (const r of lista) {
      const d = diaClave(r.scheduled_for);
      if (!g.has(d)) g.set(d, []);
      g.get(d).push(r);
    }
    const dias = [...g.entries()];
    return filtro === "proximos" ? dias : dias.reverse();
  }, [lista, filtro]);

  return (
    <section className="vista" aria-labelledby="t-agenda">
      <h1 className="titulo" id="t-agenda">Agenda de cobros</h1>
      <p className="bajada">Lo que Noe va a enviar y lo que ya envió. Toque un cobro para ver el mensaje o cambiarlo.</p>
      <div className="filtros chips" role="group" aria-label="Mostrar">
        {[["proximos", "Próximos"], ["enviados", "Enviados"], ["todos", "Todos"]].map(([id, l]) => (
          <button key={id} type="button" className="chip" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{l}</button>
        ))}
      </div>
      {error && <div className="aviso error" role="alert"><AlertTriangle size={18} />{error} <button type="button" onClick={recargar}>Reintentar</button></div>}
      {cargando && !items && <p className="ayuda"><Loader2 size={16} className="girando" /> Cargando…</p>}
      {items && grupos.length === 0 && (
        <Vacio icono={CalendarX2} titulo={filtro === "proximos" ? "Nada programado" : "Todavía no hay envíos"}>
          {filtro === "proximos" ? "Cuando programe un cobro, aparece aquí con su día y su hora." : "Los cobros enviados aparecen aquí."}
        </Vacio>
      )}
      {grupos.map(([dia, rs]) => {
        const n = carga[dia] || 0;
        return (
          <div className="dia-grupo" key={dia}>
            <div className="dia-cab">
              <h3>{nombreDia(dia)}</h3><span>{fechaCorta(dia)}</span>
              {dia >= diaClave(new Date()) && <span className={`cupo${n >= TOPE_DIA ? " lleno" : ""}`}>{n} de {TOPE_DIA} mensajes</span>}
            </div>
            {rs.map((r, i) => (
              <Item key={r.id} r={r} delay={i * 40} abierto={abierto === r.id} onAbrir={() => setAbierto(abierto === r.id ? null : r.id)}
                recargar={recargar} horario={horario} verConversacion={verConversacion} />
            ))}
          </div>
        );
      })}
    </section>
  );
}

function Item({ r, delay, abierto, onAbrir, recargar, horario, verConversacion }) {
  const [trabajando, setTrabajando] = useState(null);
  const [error, setError] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const nombre = r.contacts?.name || telefonoLegible(r.contacts?.phone) || "Sin nombre";
  const resumen = r.cobro ? `${r.cobro.concepto} · ${r.cobro.monto_texto}` : "Recordatorio";

  async function hacer(tipo, fn) {
    setTrabajando(tipo); setError("");
    try { await fn(); await recargar(); setCambiando(false); } catch (e) { setError(e.message); } finally { setTrabajando(null); }
  }

  const pendiente = r.status === "pending" && r.estado !== "pagado";
  const dentroHorario = (() => { const h = horaCaracas(new Date()); return h >= horario.inicio && h < horario.fin; })();

  return (
    <div className="item" style={{ animationDelay: `${delay}ms` }}>
      <button type="button" className="item-fila" onClick={onAbrir} aria-expanded={abierto}>
        <Inicial nombre={nombre} />
        <span className="item-txt"><b>{nombre}</b><small>{resumen}</small></span>
        <span className="item-der">
          <span className="hora">{horaLegible(r.scheduled_for)}</span>
          <span className={`estado ${r.estado}`}>{ESTADO[r.estado] || r.estado}</span>
        </span>
      </button>
      <div className={`desplegable${abierto ? " abierto" : ""}`}>
        <div>
          <div className="detalle">
            {r.status === "failed" && <div className="aviso error"><AlertTriangle size={18} />No salió: {r.error || "WhatsApp lo rechazó"}. Puede programarlo de nuevo desde Cobrar.</div>}
            {r.status === "skipped" && r.error && r.estado !== "pagado" && <p className="ayuda">{r.error}</p>}
            <div className="globo">{formatoWhatsapp(r.message_text || "")}</div>
            {cambiando && <Reprogramar horario={horario} onElegir={(iso) => hacer("fecha", () => api.reprogramar(r.id, iso))} trabajando={trabajando === "fecha"} />}
            <div className="acciones">
              {r.cobro && r.estado !== "pagado" && (
                <button type="button" className="boton chico" disabled={!!trabajando}
                  onClick={() => hacer("pago", () => api.marcarPagado({ contact_id: r.contacts.id, clave: r.window_key, reminder_id: r.id }))}>
                  {trabajando === "pago" ? <Loader2 size={16} className="girando" /> : <BadgeCheck size={17} />} Ya pagó
                </button>
              )}
              {pendiente && dentroHorario && (
                <button type="button" className="boton chico suave" disabled={!!trabajando} onClick={() => hacer("ahora", () => api.enviarAhora(r.id))}>
                  {trabajando === "ahora" ? <Loader2 size={16} className="girando" /> : <Send size={16} />} Enviar ahora
                </button>
              )}
              {pendiente && (
                <button type="button" className="boton chico suave" disabled={!!trabajando} onClick={() => setCambiando(!cambiando)}>
                  <CalendarClock size={16} /> {cambiando ? "No cambiar" : "Cambiar fecha"}
                </button>
              )}
              {r.status !== "pending" && (
                <button type="button" className="boton chico suave" onClick={() => verConversacion(r.contacts?.phone)}>
                  <MessageCircle size={16} /> Ver respuestas
                </button>
              )}
              {pendiente && (
                <button type="button" className="boton chico peligro" disabled={!!trabajando} onClick={() => hacer("cancelar", () => api.cancelarRecordatorio(r.id))}>
                  {trabajando === "cancelar" ? <Loader2 size={16} className="girando" /> : <X size={16} />} Cancelar
                </button>
              )}
            </div>
            {error && <div className="aviso error" role="alert"><AlertTriangle size={18} />{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Reprogramar({ horario, onElegir, trabajando }) {
  const hoy = diaClave(new Date());
  const [dia, setDia] = useState(sumarDias(hoy, 1));
  const horas = [9, 10, 11, 14, 16].filter((h) => h >= horario.inicio && h < horario.fin && (dia !== hoy || h > horaCaracas(new Date())));
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="chips" style={{ marginBottom: 8 }}>
        {Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i)).map((d) => (
          <button key={d} type="button" className="chip" aria-pressed={dia === d} onClick={() => setDia(d)}>
            {nombreDia(d) === "Hoy" || nombreDia(d) === "Mañana" ? nombreDia(d) : `${nombreDia(d).slice(0, 3)} ${Number(d.slice(8))}`}
          </button>
        ))}
      </div>
      <div className="chips">
        {horas.map((h) => {
          const hh = `${String(h).padStart(2, "0")}:00`;
          return (
            <button key={h} type="button" className="chip" disabled={trabajando} onClick={() => onElegir(aISO(dia, hh))}
              style={{ borderColor: "var(--azul-claro)", color: "var(--azul)" }}>
              {etiquetaHora(hh)}
            </button>
          );
        })}
        {trabajando && <Loader2 size={18} className="girando" />}
      </div>
    </div>
  );
}

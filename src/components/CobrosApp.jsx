import React, { useCallback, useEffect, useState } from "react";
import { HandCoins, CalendarDays, MessagesSquare, WalletCards, LogOut } from "lucide-react";
import { Sello } from "./comunes.jsx";
import Cobrar from "./Cobrar.jsx";
import Agenda from "./Agenda.jsx";
import Respuestas from "./Respuestas.jsx";
import Cuentas from "./Cuentas.jsx";
import * as api from "../lib/api.js";
import { CUENTAS_INICIALES, diaClave, saludoHora } from "../lib/formato.js";

// App de cobros de Nairobi (01-11-2026). Reemplaza el panel de 13 secciones: ella solo necesita
// decirle a Noe a quién cobrar, cuánto, a qué cuenta y cuándo, y ver qué le respondieron.
// El panel anterior está respaldado en Nairobi/respaldos/panel-completo-13-secciones-2026-11-01/.
const PESTANAS = [
  { id: "cobrar", label: "Cobrar", icono: HandCoins },
  { id: "agenda", label: "Agenda", icono: CalendarDays },
  { id: "respuestas", label: "Respuestas", icono: MessagesSquare },
  { id: "cuentas", label: "Cuentas", icono: WalletCards },
];

export default function CobrosApp({ onSignOut }) {
  const [pestana, setPestana] = useState("cobrar");
  const [cuentas, setCuentas] = useState(CUENTAS_INICIALES);
  const [horario, setHorario] = useState({ inicio: 8, fin: 18 });
  const [carga, setCarga] = useState({});
  const [agenda, setAgenda] = useState({ items: null, cargando: true, error: "" });
  const [convs, setConvs] = useState({ items: null, cargando: true, error: "" });
  const [abrirTelefono, setAbrirTelefono] = useState(null);
  const [recibe, setRecibe] = useState(false);

  const cargarAgenda = useCallback(async () => {
    setAgenda((a) => ({ ...a, cargando: true }));
    try {
      const [items, c] = await Promise.all([api.leerAgenda(), api.cargaPorDia(21)]);
      setAgenda({ items: [...items], cargando: false, error: "" });
      setCarga(c);
    } catch (e) {
      setAgenda((a) => ({ ...a, cargando: false, error: `No se pudo leer la agenda: ${e.message}` }));
    }
  }, []);

  const cargarConvs = useCallback(async () => {
    setConvs((c) => ({ ...c, cargando: true }));
    try {
      const items = await api.leerRespuestas();
      setConvs({ items: items.map((c) => ({ ...c, messages: [...c.messages] })), cargando: false, error: "" });
    } catch (e) {
      setConvs((c) => ({ ...c, cargando: false, error: `No se pudieron leer las respuestas: ${e.message}` }));
    }
  }, []);

  useEffect(() => {
    api.leerCuentas().then((c) => setCuentas(c)).catch(() => {});
    api.leerHorario().then(setHorario).catch(() => {});
    cargarAgenda();
    cargarConvs();
    // Se refresca solo mientras la app está abierta, y al volver a ella desde WhatsApp.
    const t = setInterval(() => { if (!document.hidden) { cargarAgenda(); cargarConvs(); } }, 60000);
    const alVolver = () => { if (!document.hidden) { cargarAgenda(); cargarConvs(); } };
    document.addEventListener("visibilitychange", alVolver);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", alVolver); };
  }, [cargarAgenda, cargarConvs]);

  function ir(id) {
    setPestana(id);
    window.scrollTo({ top: 0 });
  }

  const hoy = diaClave(new Date());
  const deHoy = (agenda.items || []).filter((r) => r.status === "pending" && diaClave(r.scheduled_for) === hoy).length;
  const sinLeer = contarSinLeer(convs.items);

  return (
    <div className="app">
      <header className="cabeza">
        <div className="cabeza-fila">
          <Sello />
          <div>
            <p className="saludo">{saludoHora()}, Nairobi</p>
            <p className="saludo-sub">
              {deHoy > 0 ? <>Hoy Noe cobra a <b>{deHoy} {deHoy === 1 ? "persona" : "personas"}</b></> : "Hoy no hay cobros pendientes"}
            </p>
          </div>
          <button type="button" className="salir" onClick={onSignOut} aria-label="Cerrar sesión"><LogOut size={20} /></button>
        </div>
        <span className="hilo-laton" aria-hidden="true" />
      </header>

      <main>
        {/* Cobrar queda montado aunque cambie de pestaña: no pierde lo que ya escribió. */}
        <div hidden={pestana !== "cobrar"}>
          <Cobrar cuentas={cuentas} setCuentas={setCuentas} carga={carga} horario={horario}
            irAgenda={() => ir("agenda")}
            onProgramado={() => { cargarAgenda(); cargarConvs(); setRecibe(true); setTimeout(() => setRecibe(false), 800); }} />
        </div>
        {pestana === "agenda" && (
          <Agenda items={agenda.items} cargando={agenda.cargando} error={agenda.error} recargar={async () => { await cargarAgenda(); await cargarConvs(); }}
            carga={carga} horario={horario} verConversacion={(phone) => { setAbrirTelefono(phone); ir("respuestas"); }} />
        )}
        {pestana === "respuestas" && (
          <Respuestas convs={convs.items} cargando={convs.cargando} error={convs.error} recargar={cargarConvs}
            abrirTelefono={abrirTelefono} limpiarAbrir={() => setAbrirTelefono(null)} />
        )}
        {pestana === "cuentas" && <Cuentas cuentas={cuentas} setCuentas={setCuentas} />}
      </main>

      <nav className="pestanas" aria-label="Secciones">
        {PESTANAS.map(({ id, label, icono: Icono }) => (
          <button key={id} type="button" data-pestana={id} className={`pestana${id === "agenda" && recibe ? " recibe" : ""}`}
            aria-current={pestana === id ? "page" : undefined} onClick={() => ir(id)}>
            <span className="marca" />
            <Icono className="ico" size={23} strokeWidth={pestana === id ? 2.1 : 1.7} />
            {label}
            {id === "respuestas" && sinLeer > 0 && <span className="burbuja-num" aria-label={`${sinLeer} sin leer`}>{sinLeer}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

function contarSinLeer(convs) {
  if (!convs) return 0;
  let visto = {};
  try { visto = JSON.parse(localStorage.getItem("nairobi-respuestas-visto") || "{}"); } catch { /* sin almacenamiento */ }
  return convs.filter((c) => { const u = c.messages.at(-1); return u && u.direction === "inbound" && visto[c.id] !== u.id; }).length;
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Plus, Send, UserRound, X, AlertTriangle, CalendarClock } from "lucide-react";
import { Segmento, Interruptor } from "./comunes.jsx";
import * as api from "../lib/api.js";
import {
  mascaraTelefono, normalizarTelefono, telefonoLegible, leerMonto, textoMonto, monto as fmtMonto, componerMensaje,
  pasosPorDefecto, primerNombre, diaClave, sumarDias, nombreDia, fechaCorta, aISO, etiquetaHora, horaCaracas,
  cuandoLegible, cuandoFrase, horaLegible, TIPOS_CUENTA, nombreCuenta, cuentaEnUnaLinea, nuevaClave,
} from "../lib/formato.js";

export const TOPE_DIA = 5; // regla de Sebastián: máximo 5 mensajes por día desde el WhatsApp de Nairobi
const CONCEPTOS = ["Póliza de salud", "RCV", "Póliza de vehículo", "Fianza", "Cuota de financiamiento"];
const CUENTA_VACIA = { tipo: "pago_movil", alias: "", banco: "", titular: "", documento: "", numero: "", telefono: "", correo: "", detalle: "" };

export default function Cobrar({ cuentas, setCuentas, carga, horario, onProgramado, irAgenda }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sugeridos, setSugeridos] = useState([]);
  const [elegido, setElegido] = useState(null);
  const [montoTxt, setMontoTxt] = useState("");
  const [moneda, setMoneda] = useState("USD");
  const [tasaBcv, setTasaBcv] = useState(true);
  const [concepto, setConcepto] = useState("");
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id || null);
  const [nueva, setNueva] = useState(null);
  const [guardarFrecuente, setGuardarFrecuente] = useState(true);
  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState(null);
  const [pasos, setPasos] = useState(null); // null = los pasos por defecto, que siguen al monto
  const [nota, setNota] = useState("");
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(null);
  const globoRef = useRef(null);

  useEffect(() => { if (!cuentaId && cuentas[0]) setCuentaId(cuentas[0].id); }, [cuentas, cuentaId]);

  // Sugerencias de sus contactos mientras escribe el nombre o el número
  useEffect(() => {
    if (elegido) return;
    const t = setTimeout(() => {
      const busca = telefono.replace(/\D/g, "").length >= 4 ? telefono : nombre;
      api.buscarContactos(busca).then(setSugeridos).catch(() => setSugeridos([]));
    }, 280);
    return () => clearTimeout(t);
  }, [nombre, telefono, elegido]);

  const phone = normalizarTelefono(telefono);
  const montoNum = leerMonto(montoTxt);
  const cuenta = nueva ? { ...nueva, id: "nueva" } : cuentas.find((c) => c.id === cuentaId) || null;
  const cuentaValida = cuenta && (cuenta.tipo === "efectivo" || cuenta.tipo === "otro" ? cuenta.detalle || cuenta.alias
    : cuenta.tipo === "zelle" ? cuenta.correo || cuenta.telefono : cuenta.numero || cuenta.telefono);
  const hoy = diaClave(new Date());
  const ahoraHora = horaCaracas(new Date());
  const dentroHorario = ahoraHora >= horario.inicio && ahoraHora < horario.fin;

  const cuando = useMemo(() => {
    if (!dia || !hora) return null;
    if (hora === "ahora") return new Date(Date.now() + 60 * 1000).toISOString();
    return aISO(dia, hora);
  }, [dia, hora]);

  const datos = { nombre, monto: montoNum, moneda, tasaBcv, concepto, cuenta, pasos };
  const pasosVista = pasos || pasosPorDefecto(datos);
  const mensaje = componerMensaje({ ...datos, pasos: pasosVista });

  const listo = {
    quien: nombre.trim().length > 1 && !!phone,
    cuanto: montoNum > 0 && concepto.trim().length > 1,
    donde: !!cuentaValida,
    cuando: !!cuando && new Date(cuando).getTime() > Date.now() - 60000,
  };
  const todoListo = Object.values(listo).every(Boolean);
  const cargaDia = dia ? carga[dia] || 0 : 0;
  const diaLibre = useMemo(() => {
    for (let i = 1; i < 21; i++) { const d = sumarDias(dia || hoy, i); if ((carga[d] || 0) < TOPE_DIA) return d; }
    return null;
  }, [dia, carga, hoy]);

  const horas = useMemo(() => {
    const base = [9, 10, 11, 14, 16].filter((h) => h >= horario.inicio && h < horario.fin);
    return base.filter((h) => dia !== hoy || h > ahoraHora).map((h) => `${String(h).padStart(2, "0")}:00`);
  }, [horario, dia, hoy, ahoraHora]);

  function elegirContacto(c) {
    setElegido(c);
    setNombre(c.name || "");
    setTelefono(mascaraTelefono(telefonoLegible(c.phone)));
    setSugeridos([]);
  }

  async function programar() {
    setIntento(true);
    setError("");
    if (!todoListo || enviando) return;
    setEnviando(true);
    try {
      const clave = nuevaClave();
      let lista = cuentas;
      let cuentaFinal = cuenta;
      if (nueva) {
        cuentaFinal = { ...CUENTA_VACIA, ...nueva, id: `c-${clave.slice(0, 8)}` };
      }
      const resp = await api.programarCobro({
        clave, name: nombre.trim(), phone, scheduled_for: cuando, message_text: mensaje,
        cobro: {
          concepto: concepto.trim(), monto: montoNum, moneda, monto_texto: textoMonto(datos),
          cuenta_id: cuentaFinal.id, cuenta_texto: cuentaEnUnaLinea(cuentaFinal), nota: nota.trim(),
        },
      });
      // La cuenta usada sube al primer lugar: así las frecuentes quedan siempre a mano.
      if (guardarFrecuente || !nueva) {
        const usada = { ...cuentaFinal, usado: new Date().toISOString().slice(0, 10) };
        lista = [usada, ...cuentas.filter((c) => c.id !== usada.id)];
        api.guardarCuentas(lista).then(() => setCuentas(lista)).catch(() => setCuentas(lista));
      }
      // El globo de la vista previa vuela hacia la pestaña Agenda
      const g = globoRef.current;
      const destino = document.querySelector('[data-pestana="agenda"]');
      if (g && destino && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const a = g.getBoundingClientRect();
        const b = destino.getBoundingClientRect();
        g.style.setProperty("--vx", `${b.left + b.width / 2 - a.left - a.width * 0.04}px`);
        g.style.setProperty("--vy", `${b.top + 10 - a.top}px`);
        g.classList.add("vuela");
        await new Promise((r) => setTimeout(r, 820));
      }
      onProgramado?.();
      setExito({ nombre: primerNombre(nombre), cuando, reminderId: resp?.data?.reminder_id });
      setNueva(null);
      setCuentaId(cuentaFinal.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  function otraPersona() {
    globoRef.current?.classList.remove("vuela");
    setExito(null); setNombre(""); setTelefono(""); setElegido(null); setMontoTxt(""); setConcepto("");
    setDia(null); setHora(null); setPasos(null); setNota(""); setIntento(false); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const estado = (k, previo = true) => (listo[k] ? "listo" : previo ? "activo" : "espera");

  return (
    <section className="vista" aria-labelledby="t-cobrar">
      <h1 className="titulo" id="t-cobrar">¿A quién le cobramos?</h1>
      <p className="bajada">Llene los datos y Noe le escribe a la persona el día que usted elija, con el monto, la cuenta y lo que debe hacer.</p>

      {/* 1 · Persona */}
      <div className="paso" data-estado={estado("quien")}>
        <div className="paso-cab">
          <span className="paso-num">{listo.quien ? <Check size={15} /> : 1}</span>
          <h2 className="paso-tit">La persona</h2>
        </div>
        <label className="campo">
          <span>Nombre</span>
          <input className="entrada" value={nombre} autoComplete="off" placeholder="Ej. María Fernanda López"
            aria-invalid={intento && nombre.trim().length < 2}
            onChange={(e) => { setNombre(e.target.value); setElegido(null); }} />
        </label>
        <label className="campo">
          <span>WhatsApp</span>
          <input className="entrada" value={telefono} inputMode="tel" autoComplete="off" placeholder="0414-123 4567"
            aria-invalid={intento && !phone}
            onChange={(e) => { setTelefono(mascaraTelefono(e.target.value)); setElegido(null); }} />
          {intento && !phone && <p className="ayuda error">Escriba el número completo, así: 0414-123 4567.</p>}
        </label>
        {sugeridos.length > 0 && (
          <div className="chips" aria-label="Sus contactos">
            {sugeridos.map((c, i) => (
              <button key={c.id} type="button" className="chip sugerido" style={{ animationDelay: `${i * 50}ms` }} onClick={() => elegirContacto(c)}>
                <UserRound size={16} /> {c.name} · {telefonoLegible(c.phone)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2 · Monto */}
      <div className="paso" data-estado={estado("cuanto", listo.quien)}>
        <div className="paso-cab">
          <span className="paso-num">{listo.cuanto ? <Check size={15} /> : 2}</span>
          <h2 className="paso-tit">Cuánto debe</h2>
        </div>
        <Segmento etiqueta="Moneda" valor={moneda} onCambio={setMoneda}
          opciones={[{ id: "USD", label: "Dólares" }, { id: "VES", label: "Bolívares" }]} />
        <label className="monto-fila">
          <span className="moneda-sim">{moneda === "VES" ? "Bs." : "$"}</span>
          <input value={montoTxt} inputMode="decimal" placeholder="0,00" aria-label="Monto"
            aria-invalid={intento && !(montoNum > 0)}
            onChange={(e) => setMontoTxt(e.target.value.replace(/[^\d.,]/g, ""))}
            onBlur={() => montoNum > 0 && setMontoTxt(fmtMonto(montoNum, moneda).replace(/^Bs\.\s|\s\$$/g, ""))} />
        </label>
        {moneda === "USD" && (
          <Interruptor activo={tasaBcv} onCambio={setTasaBcv} detalle="Así se lo dice Noe en el mensaje.">
            Se paga en bolívares a tasa BCV
          </Interruptor>
        )}
        <label className="campo" style={{ marginTop: 6 }}>
          <span>Por qué es el pago</span>
          <input className="entrada" value={concepto} placeholder="Ej. Póliza RCV de su moto"
            aria-invalid={intento && concepto.trim().length < 2} onChange={(e) => setConcepto(e.target.value)} />
        </label>
        <div className="chips">
          {CONCEPTOS.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={concepto === c} onClick={() => setConcepto(c)}>{c}</button>
          ))}
        </div>
      </div>

      {/* 3 · Cuenta */}
      <div className="paso" data-estado={estado("donde", listo.cuanto)}>
        <div className="paso-cab">
          <span className="paso-num">{listo.donde ? <Check size={15} /> : 3}</span>
          <h2 className="paso-tit">A dónde paga</h2>
        </div>
        <div className="carril" role="radiogroup" aria-label="Cuentas frecuentes">
          {cuentas.map((c) => (
            <button key={c.id} type="button" className="cuenta" role="radio" aria-pressed={!nueva && cuentaId === c.id}
              aria-checked={!nueva && cuentaId === c.id} onClick={() => { setNueva(null); setCuentaId(c.id); }}>
              <span className="marca-sel">{!nueva && cuentaId === c.id && <Check size={15} strokeWidth={2.5} />}</span>
              <span className="tipo">{TIPOS_CUENTA.find((t) => t.id === c.tipo)?.label}</span>
              <span className="alias">{nombreCuenta(c)}</span>
              <span className="dato">{c.tipo === "pago_movil" ? `${c.telefono} · ${c.documento}` : c.numero || c.correo || c.detalle}</span>
            </button>
          ))}
          <button type="button" className="cuenta nueva" onClick={() => setNueva(nueva || { ...CUENTA_VACIA })}>
            <Plus size={20} /> Otra cuenta
          </button>
        </div>
        {nueva && (
          <FormCuenta valor={nueva} onCambio={setNueva} onCerrar={() => setNueva(null)}>
            <Interruptor activo={guardarFrecuente} onCambio={setGuardarFrecuente} detalle="La próxima vez aparece de primera.">
              Guardar en mis cuentas frecuentes
            </Interruptor>
          </FormCuenta>
        )}
        {intento && !cuentaValida && <p className="ayuda error">Elija una cuenta o complete los datos de la nueva.</p>}
      </div>

      {/* 4 · Cuándo */}
      <div className="paso" data-estado={estado("cuando", listo.donde)}>
        <div className="paso-cab">
          <span className="paso-num">{listo.cuando ? <Check size={15} /> : 4}</span>
          <h2 className="paso-tit">Cuándo le escribe Noe</h2>
        </div>
        <div className="dias" role="radiogroup" aria-label="Día del cobro">
          {Array.from({ length: 14 }, (_, i) => sumarDias(hoy, i)).map((d) => {
            const n = carga[d] || 0;
            return (
              <button key={d} type="button" className="dia" aria-pressed={dia === d}
                aria-label={`${nombreDia(d)} ${fechaCorta(d)}, ${n} de ${TOPE_DIA} mensajes`}
                onClick={() => { setDia(d); if (hora === "ahora" && d !== hoy) setHora(null); }}>
                <span className="dsem">{i18nDia(d)}</span>
                <span className="dnum">{Number(d.slice(8))}</span>
                <span className={`carga${n >= TOPE_DIA ? " lleno" : ""}`}>
                  {Array.from({ length: TOPE_DIA }, (_, k) => <i key={k} className={k < n ? "ocupado" : ""} />)}
                </span>
              </button>
            );
          })}
        </div>
        {dia && (
          <div className="chips" role="radiogroup" aria-label="Hora">
            {dia === hoy && dentroHorario && (
              <button type="button" className="chip" aria-pressed={hora === "ahora"} onClick={() => setHora("ahora")}>Ahora mismo</button>
            )}
            {horas.map((h) => (
              <button key={h} type="button" className="chip" aria-pressed={hora === h} onClick={() => setHora(h)}>{etiquetaHora(h)}</button>
            ))}
            <label className="chip" aria-pressed={!!hora && hora !== "ahora" && !horas.includes(hora)} style={{ position: "relative" }}>
              {hora && hora !== "ahora" && !horas.includes(hora) ? etiquetaHora(hora) : "Otra hora"}
              <input type="time" step="900" aria-label="Otra hora" min={`${String(horario.inicio).padStart(2, "0")}:00`}
                max={`${String(horario.fin - 1).padStart(2, "0")}:59`}
                style={{ position: "absolute", inset: 0, opacity: 0 }}
                onChange={(e) => e.target.value && setHora(e.target.value)} />
            </label>
          </div>
        )}
        {dia && horas.length === 0 && !(dia === hoy && dentroHorario) && (
          <p className="ayuda">Hoy ya pasó el horario de Noe ({horario.inicio}:00 a {horario.fin}:00). Elija otro día.</p>
        )}
        {hora && hora !== "ahora" && (Number(hora.slice(0, 2)) < horario.inicio || Number(hora.slice(0, 2)) >= horario.fin) && (
          <div className="aviso"><AlertTriangle size={18} />Noe solo escribe de {horario.inicio}:00 a {horario.fin}:00. A esa hora el mensaje sale cuando abra el horario.</div>
        )}
        {dia && cargaDia >= TOPE_DIA && (
          <div className="aviso">
            <AlertTriangle size={18} style={{ flex: "none", marginTop: 2 }} />
            <span>
              Ese día ya salen {cargaDia} mensajes desde su WhatsApp. Lo seguro son {TOPE_DIA} por día para no perder la vinculación.
              {diaLibre && <> <button type="button" onClick={() => setDia(diaLibre)}>Pasarlo al {nombreDia(diaLibre).toLowerCase()} {fechaCorta(diaLibre)}</button></>}
            </span>
          </div>
        )}
      </div>

      {/* 5 · Qué debe hacer */}
      <div className="paso" data-estado="activo">
        <div className="paso-cab">
          <span className="paso-num">5</span>
          <h2 className="paso-tit">Qué debe hacer la persona</h2>
        </div>
        <ol className="pasos-lista">
          {pasosVista.map((p, i) => (
            <li key={i}>
              <textarea className="entrada" rows={1} value={p} aria-label={`Paso ${i + 1}`} ref={(el) => autoAlto(el)}
                onChange={(e) => setPasos(pasosVista.map((x, k) => (k === i ? e.target.value : x)))} />
              {pasosVista.length > 1 && (
                <button type="button" className="quitar" aria-label={`Quitar paso ${i + 1}`}
                  onClick={() => setPasos(pasosVista.filter((_, k) => k !== i))}><X size={18} /></button>
              )}
            </li>
          ))}
        </ol>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          {pasosVista.length < 6 && <button type="button" className="enlace" onClick={() => setPasos([...pasosVista, ""])}><Plus size={16} /> Agregar un paso</button>}
          {pasos && <button type="button" className="enlace" onClick={() => setPasos(null)}>Volver a los pasos de siempre</button>}
        </div>
        <label className="campo" style={{ marginTop: 10 }}>
          <span>Nota para Noe (la persona no la ve)</span>
          <textarea className="entrada" rows={2} value={nota} placeholder="Ej. si pide prórroga, puede pagar hasta el 20"
            onChange={(e) => setNota(e.target.value)} />
        </label>
      </div>

      <Previa ref={globoRef} nombre={nombre} mensaje={mensaje} cuando={cuando}
        resaltar={[primerNombre(nombre), textoMonto(datos), concepto.trim(), cuenta && cuenta.titular].filter(Boolean)} />

      <div className="barra-accion">
        <p className="resumen" aria-live="polite">
          {todoListo ? `Noe le escribe a ${primerNombre(nombre)} · ${cuandoLegible(cuando)}`
            : !listo.quien ? "Falta la persona" : !listo.cuanto ? "Falta el monto y el motivo"
            : !listo.donde ? "Falta la cuenta" : "Falta el día y la hora"}
        </p>
        <button type="button" className="boton ancho laton" onClick={programar} disabled={enviando} aria-disabled={!todoListo}>
          {enviando ? <><Loader2 size={19} className="girando" /> Guardando…</> : <><Send size={18} /> Programar cobro</>}
        </button>
        {error && <div className="aviso error" role="alert"><AlertTriangle size={18} style={{ flex: "none", marginTop: 2 }} />{error}</div>}
      </div>

      {exito && createPortal(
        <>
          <div className="velo" onClick={otraPersona} />
          <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-exito">
            <svg className="check" viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="34" /><path d="M26 41 l10 10 l19 -21" />
            </svg>
            <h2 id="t-exito">Listo, Nairobi</h2>
            <p>
              Noe le escribe a {exito.nombre} {cuandoFrase(exito.cuando)} con el monto, la cuenta y los pasos. Si responde, lo ve en Respuestas.
            </p>
            <div className="botones">
              <button type="button" className="boton ancho" onClick={otraPersona}><Plus size={18} /> Cobrar a otra persona</button>
              <button type="button" className="boton ancho suave" onClick={() => { otraPersona(); irAgenda(); }}><CalendarClock size={18} /> Ver la agenda</button>
            </div>
          </div>
        </>, document.body,
      )}
    </section>
  );
}

// El cuadro crece con el texto: los pasos se leen completos sin barra de desplazamiento.
function autoAlto(el) {
  if (!el) return;
  const ajustar = () => { el.style.height = "auto"; el.style.height = `${el.scrollHeight + 2}px`; };
  ajustar();
  if (!el.dataset.auto) {
    el.dataset.auto = "1";
    el.addEventListener("input", ajustar);
    document.fonts?.ready.then(ajustar);
    if (window.ResizeObserver) new ResizeObserver(ajustar).observe(el.parentElement);
  }
}

function i18nDia(d) {
  const n = nombreDia(d);
  return n === "Hoy" || n === "Mañana" ? n : n.slice(0, 3);
}

export function FormCuenta({ valor, onCambio, onCerrar, children }) {
  const set = (k) => (e) => onCambio({ ...valor, [k]: e.target.value });
  const t = valor.tipo;
  return (
    <div className="formulario-cuenta">
      <div className="chips" role="radiogroup" aria-label="Tipo de cuenta" style={{ marginBottom: 12 }}>
        {TIPOS_CUENTA.filter((x) => x.id !== "otro").map((x) => (
          <button key={x.id} type="button" className="chip" aria-pressed={t === x.id} onClick={() => onCambio({ ...valor, tipo: x.id })}>{x.label}</button>
        ))}
      </div>
      {(t === "pago_movil" || t === "transferencia") && (
        <label className="campo"><span>Banco</span><input className="entrada" value={valor.banco} onChange={set("banco")} placeholder="Ej. Banco de Venezuela" /></label>
      )}
      {t === "transferencia" && (
        <label className="campo"><span>Número de cuenta</span><input className="entrada" inputMode="numeric" value={valor.numero} onChange={set("numero")} placeholder="0102-0000-00-0000000000" /></label>
      )}
      {(t === "pago_movil" || t === "zelle") && (
        <label className="campo"><span>Teléfono</span><input className="entrada" inputMode="tel" value={valor.telefono} onChange={set("telefono")} placeholder="0414-123 4567" /></label>
      )}
      {t === "zelle" && (
        <label className="campo"><span>Correo</span><input className="entrada" type="email" value={valor.correo} onChange={set("correo")} placeholder="correo@ejemplo.com" /></label>
      )}
      {t !== "efectivo" && (
        <div className="dos">
          <label className="campo"><span>A nombre de</span><input className="entrada" value={valor.titular} onChange={set("titular")} /></label>
          {t !== "zelle" && <label className="campo"><span>Cédula o RIF</span><input className="entrada" value={valor.documento} onChange={set("documento")} placeholder="V-12345678" /></label>}
        </div>
      )}
      <label className="campo">
        <span>{t === "efectivo" ? "Dónde o cómo entrega el efectivo" : "Algo más (opcional)"}</span>
        <input className="entrada" value={valor.detalle} onChange={set("detalle")} placeholder={t === "efectivo" ? "Ej. en la oficina de lunes a viernes" : "Ej. concepto: nombre y cédula"} />
      </label>
      <label className="campo"><span>Nombre corto para reconocerla</span><input className="entrada" value={valor.alias} onChange={set("alias")} placeholder="Ej. Mi pago móvil Venezuela" /></label>
      {children}
      {onCerrar && <button type="button" className="enlace" onClick={onCerrar}><X size={16} /> Usar una cuenta guardada</button>}
    </div>
  );
}

// Lo que la persona va a ver en su WhatsApp. Cada cambio pasa por «escribiendo…» y resalta lo nuevo.
const Previa = React.forwardRef(function Previa({ nombre, mensaje, cuando, resaltar }, ref) {
  const [escribe, setEscribe] = useState(false);
  const [mostrado, setMostrado] = useState(mensaje);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (mensaje === mostrado) return;
    setEscribe(true);
    const t = setTimeout(() => { setMostrado(mensaje); setEscribe(false); setTick((x) => x + 1); }, 520);
    return () => clearTimeout(t);
  }, [mensaje]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="previa" aria-label="Vista previa del mensaje">
      <div className="previa-cab">
        <img src="/branding/nairobi.jpg" alt="" />
        <div>
          <b>Nairobi Montilla</b>
          <small className={escribe ? "escribe" : ""}>{escribe ? "Noe está escribiendo…" : `Así le llega a ${primerNombre(nombre) || "la persona"}`}</small>
        </div>
      </div>
      <div className="previa-cuerpo">
        <p className="previa-para">{cuando ? cuandoLegible(cuando) : "Elija el día y la hora"}</p>
        {escribe && <div className="escribiendo" aria-hidden="true"><i /><i /><i /></div>}
        <div ref={ref} key={tick} className={`globo${tick ? " recarga" : ""}`}>
          {formatoWhatsapp(mostrado, resaltar)}
          <span className="hora">{cuando ? horaLegible(cuando) : ""}</span>
        </div>
      </div>
    </div>
  );
});

// *negrita* de WhatsApp → <b>; los datos que acaba de escribir quedan resaltados un instante.
export function formatoWhatsapp(texto, resaltar = []) {
  const vals = [...new Set(resaltar.filter((v) => v && v.length > 1))].sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const partes = texto.split(/(\*[^*\n]+\*)/g);
  return partes.map((p, i) => {
    const negrita = /^\*[^*]+\*$/.test(p);
    const cuerpo = negrita ? p.slice(1, -1) : p;
    const trozos = vals.length ? cuerpo.split(new RegExp(`(${vals.map(esc).join("|")})`, "g")) : [cuerpo];
    const nodos = trozos.map((t, k) => (vals.includes(t) ? <mark key={k}>{t}</mark> : t));
    return negrita ? <b key={i}>{nodos}</b> : <React.Fragment key={i}>{nodos}</React.Fragment>;
  });
}

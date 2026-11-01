// Formatos de la app de cobros. Todo se muestra en hora de Caracas (UTC-4 todo el año, sin horario de verano),
// aunque el teléfono esté en otra zona: Noe y W6 trabajan en esa hora.
export const TZ = "America/Caracas";
const OFFSET = "-04:00";

export function soloDigitos(v) {
  return String(v || "").replace(/\D/g, "");
}

// "04141234567" | "4141234567" | "584141234567" → "584141234567" (lo que espera W12). null si no se entiende.
export function normalizarTelefono(v) {
  const d = soloDigitos(v);
  if (/^0\d{10}$/.test(d)) return "58" + d.slice(1);
  if (/^4\d{9}$/.test(d)) return "58" + d;
  if (/^58\d{10}$/.test(d)) return d;
  if (/^[1-9]\d{9,14}$/.test(d)) return d;
  return null;
}

// Mientras escribe: 0414-123 4567
export function mascaraTelefono(v) {
  let d = soloDigitos(v);
  if (d.startsWith("58") && d.length > 11) d = "0" + d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 7)} ${d.slice(7)}`;
}

export function telefonoLegible(phone) {
  const d = soloDigitos(phone);
  if (/^58\d{10}$/.test(d)) return mascaraTelefono("0" + d.slice(2));
  return d ? `+${d}` : "";
}

export function monto(n, moneda) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  const [ent, dec] = v.toFixed(2).split(".");
  const txt = `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
  return moneda === "VES" ? `Bs. ${txt}` : `${txt} $`;
}

// "1.234,5" / "1234.50" / "45" → número
export function leerMonto(texto) {
  let t = String(texto || "").replace(/[^\d.,]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

const fmt = (opts) => new Intl.DateTimeFormat("es-VE", { timeZone: TZ, ...opts });

// Clave de día en Caracas: "2026-11-05"
export function diaClave(fecha) {
  const p = Object.fromEntries(fmt({ year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(fecha)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function horaCaracas(fecha) {
  return Number(fmt({ hour: "numeric", hourCycle: "h23" }).format(new Date(fecha)));
}

// "2026-11-05" + "09:00" (hora de Caracas) → ISO real
export function aISO(dia, hora) {
  return new Date(`${dia}T${hora}:00${OFFSET}`).toISOString();
}

export function sumarDias(dia, n) {
  const d = new Date(`${dia}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return diaClave(d);
}

export function nombreDia(dia) {
  const hoy = diaClave(new Date());
  if (dia === hoy) return "Hoy";
  if (dia === sumarDias(hoy, 1)) return "Mañana";
  const t = fmt({ weekday: "long" }).format(new Date(`${dia}T12:00:00${OFFSET}`));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function fechaCorta(dia) {
  return fmt({ day: "numeric", month: "short" }).format(new Date(`${dia}T12:00:00${OFFSET}`)).replace(".", "");
}

export function horaLegible(fecha) {
  return fmt({ hour: "numeric", minute: "2-digit" }).format(new Date(fecha)).replace(/\s?([ap])\.\s?m\./i, " $1m");
}

export function etiquetaHora(hhmm) {
  return horaLegible(new Date(`2026-01-01T${hhmm}:00${OFFSET}`));
}

export function cuandoLegible(iso) {
  return `${nombreDia(diaClave(iso))} ${fechaCorta(diaClave(iso))}, ${horaLegible(iso)}`;
}

// "hoy a las 3:00 pm" / "mañana a las 9:00 am" / "el martes 3 nov a las 9:00 am"
export function cuandoFrase(iso) {
  const d = diaClave(iso);
  const n = nombreDia(d);
  const dia = n === "Hoy" || n === "Mañana" ? n.toLowerCase() : `el ${n.toLowerCase()} ${fechaCorta(d)}`;
  return `${dia} a las ${horaLegible(iso)}`;
}

export function saludoHora() {
  const h = horaCaracas(new Date());
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function primerNombre(nombre) {
  return String(nombre || "").trim().split(/\s+/)[0] || "";
}

// ── Cuentas ──────────────────────────────────────────────────────────────────────────────────────
export const TIPOS_CUENTA = [
  { id: "pago_movil", label: "Pago móvil" },
  { id: "transferencia", label: "Transferencia" },
  { id: "zelle", label: "Zelle" },
  { id: "efectivo", label: "Efectivo" },
  { id: "otro", label: "Otro" },
];

export function nombreCuenta(m) {
  if (!m) return "";
  if (m.alias) return m.alias;
  const tipo = TIPOS_CUENTA.find((t) => t.id === m.tipo)?.label || "Cuenta";
  return [tipo, m.banco].filter(Boolean).join(" · ");
}

// Líneas que van en el WhatsApp, en el orden en que la persona las copia para pagar.
export function lineasCuenta(m) {
  if (!m) return [];
  const l = [];
  const tipo = TIPOS_CUENTA.find((t) => t.id === m.tipo)?.label || "Pago";
  if (m.tipo === "pago_movil") {
    l.push(`*Pago móvil*${m.banco ? ` · ${m.banco}` : ""}`);
    if (m.telefono) l.push(`Teléfono: ${m.telefono}`);
    if (m.documento) l.push(`Cédula/RIF: ${m.documento}`);
    if (m.titular) l.push(`A nombre de: ${m.titular}`);
  } else if (m.tipo === "transferencia") {
    l.push(`*Transferencia*${m.banco ? ` · ${m.banco}` : ""}`);
    if (m.numero) l.push(`Cuenta: ${m.numero}`);
    if (m.titular) l.push(`A nombre de: ${m.titular}`);
    if (m.documento) l.push(`RIF/Cédula: ${m.documento}`);
  } else if (m.tipo === "zelle") {
    l.push("*Zelle*");
    if (m.correo) l.push(`Correo: ${m.correo}`);
    if (m.telefono) l.push(`Teléfono: ${m.telefono}`);
    if (m.titular) l.push(`A nombre de: ${m.titular}`);
  } else {
    l.push(`*${tipo}*`);
  }
  if (m.detalle) l.push(m.detalle);
  return l;
}

export function cuentaEnUnaLinea(m) {
  return lineasCuenta(m).map((x) => x.replace(/\*/g, "")).join(" · ");
}

// Cuentas de la financiadora que Nairobi ya les manda a sus clientes de Seguros Constitución
// (sacadas de sus chats, Brain FICHAS_COBRANZA_2026-09-29). Se ofrecen solo si todavía no guardó ninguna.
export const CUENTAS_INICIALES = [
  { id: "segucons-pm", tipo: "pago_movil", alias: "Inversora Segucons · Pago móvil", banco: "Banco Fondo Común (0151)",
    telefono: "0424-2030177", documento: "J-314308386", titular: "Inversora Segucons, C.A.", numero: "", correo: "", detalle: "" },
  { id: "segucons-bdv", tipo: "transferencia", alias: "Inversora Segucons · Venezuela", banco: "Banco de Venezuela",
    numero: "0102-0139-01-0000034924", titular: "Inversora Segucons, C.A.", documento: "J-314308386", telefono: "", correo: "", detalle: "" },
  { id: "segucons-bnc", tipo: "transferencia", alias: "Inversora Segucons · BNC", banco: "Banco Nacional de Crédito",
    numero: "0191-0098-74-2198087853", titular: "Inversora Segucons, C.A.", documento: "J-314308386", telefono: "", correo: "", detalle: "" },
];

// ── El mensaje que Noe envía ────────────────────────────────────────────────────────────────────
export function textoMonto(c) {
  if (c.monto == null) return "";
  const base = monto(c.monto, c.moneda);
  return c.moneda === "USD" && c.tasaBcv ? `${base} (en bolívares a tasa BCV del día)` : base;
}

export function pasosPorDefecto(c) {
  const m = c.monto != null ? ` de ${monto(c.monto, c.moneda)}` : "";
  return [
    `Haga el pago${m}${c.moneda === "USD" && c.tasaBcv ? " en bolívares, a la tasa BCV del día," : ""} a la cuenta de arriba.`,
    "Envíeme por aquí la captura o el comprobante.",
    "Nairobi lo confirma y le manda su recibo.",
  ];
}

export function componerMensaje(c) {
  const nombre = primerNombre(c.nombre);
  const pasos = (c.pasos && c.pasos.length ? c.pasos : pasosPorDefecto(c)).filter((p) => p.trim());
  const partes = [
    `Saludos${nombre ? ` ${nombre}` : ""}! Dios le bendiga 🙏`,
    `Le escribe Noe, asistente de Nairobi Montilla. Le recuerdo el pago de *${c.concepto || "su póliza"}*${textoMonto(c) ? `: *${textoMonto(c)}*` : ""}.`,
  ];
  const cuenta = lineasCuenta(c.cuenta);
  if (cuenta.length) partes.push(`Puede pagar a:\n${cuenta.join("\n")}`);
  if (pasos.length) partes.push(`Qué debe hacer:\n${pasos.map((p, i) => `${i + 1}. ${p}`).join("\n")}`);
  partes.push("Si ya pagó, envíeme el comprobante por favor. Siempre a la orden!");
  return partes.join("\n\n");
}

export function nuevaClave() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

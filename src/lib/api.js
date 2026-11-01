// Capa de datos de la app de cobros. Lee de Supabase (solo lectura por RLS) y escribe siempre por n8n:
// W12 (cobro-programar, cobro-pagado, metodos-pago) y los recursos de W8 que ya existían
// (reminder-create para reprogramar/cancelar, reminder-send-now, send-message, bot-toggle).
// Sin Supabase y con VITE_ALLOW_DEMO=true trabaja con datos de ejemplo en memoria, para probar la interfaz.
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { CUENTAS_INICIALES, diaClave, sumarDias, aISO } from "./formato.js";

const N8N_URL = import.meta.env.VITE_N8N_APP_WEB_URL || "";
const N8N_SECRET = import.meta.env.VITE_N8N_APP_WEB_SECRET || "";
export const DEMO = !isSupabaseConfigured && import.meta.env.VITE_ALLOW_DEMO === "true";

async function n8n(resource, body) {
  if (DEMO) return demo.n8n(resource, body);
  if (!N8N_URL) throw new Error("La app no tiene configurada la conexión con Noe (VITE_N8N_APP_WEB_URL).");
  let res;
  try {
    res = await fetch(`${N8N_URL.replace(/\/$/, "")}/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(N8N_SECRET ? { "x-app-web-secret": N8N_SECRET } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Sin conexión. Revise el internet e intente de nuevo.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    if (res.status === 404) throw new Error("Noe todavía no tiene activa esta función. Avísele a Sebastián.");
    throw new Error(data?.error || "Noe no pudo guardarlo. Intente de nuevo en un momento.");
  }
  return data;
}

async function q(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

export async function leerCuentas() {
  if (DEMO) return demo.cuentas;
  const row = await q(supabase.from("settings").select("value").eq("key", "metodos_pago_frecuentes").maybeSingle());
  return Array.isArray(row?.value) ? row.value : CUENTAS_INICIALES;
}

export const guardarCuentas = (metodos) => n8n("metodos-pago", { metodos });

export async function leerHorario() {
  if (DEMO) return { inicio: 8, fin: 18 };
  const rows = await q(supabase.from("settings").select("key, value").in("key", ["business_hours_start", "business_hours_end"]));
  const m = Object.fromEntries((rows || []).map((r) => [r.key, Number(r.value)]));
  return { inicio: Number.isFinite(m.business_hours_start) ? m.business_hours_start : 8,
           fin: Number.isFinite(m.business_hours_end) ? m.business_hours_end : 18 };
}

export async function buscarContactos(texto) {
  const t = String(texto || "").trim();
  if (t.length < 2) return [];
  if (DEMO) return demo.contactos.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(t.toLowerCase())).slice(0, 4);
  const digitos = t.replace(/\D/g, "");
  const filtro = digitos.length >= 4
    ? `phone.ilike.%${digitos.replace(/^0/, "")}%`
    : `name.ilike.%${t.replace(/[%,()]/g, "")}%`;
  return q(supabase.from("contacts").select("id, name, phone").or(filtro).not("name", "is", null).limit(4));
}

// Mensajes que saldrán (o salieron) por el WhatsApp de Nairobi cada día: de la app, manuales y automáticos.
export async function cargaPorDia(dias = 14) {
  const hoy = diaClave(new Date());
  if (DEMO) return contarPorDia(demo.recordatorios);
  const rows = await q(supabase.from("reminders").select("scheduled_for, status")
    .in("status", ["pending", "sent"])
    .gte("scheduled_for", aISO(hoy, "00:00"))
    .lt("scheduled_for", aISO(sumarDias(hoy, dias), "00:00")));
  return contarPorDia(rows || []);
}

function contarPorDia(rows) {
  const m = {};
  for (const r of rows) if (["pending", "sent"].includes(r.status)) m[diaClave(r.scheduled_for)] = (m[diaClave(r.scheduled_for)] || 0) + 1;
  return m;
}

export async function leerAgenda() {
  if (DEMO) return demo.recordatorios;
  return q(supabase.from("reminders")
    .select("id, window_key, scheduled_for, sent_at, status, error, message_text, contacts(id, name, phone, metadata)")
    .eq("kind", "custom")
    .gte("scheduled_for", new Date(Date.now() - 21 * 864e5).toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(200));
}

export const programarCobro = (datos) => n8n("cobro-programar", datos);
export const marcarPagado = ({ contact_id, clave, reminder_id }) => n8n("cobro-pagado", { contact_id, clave, reminder_id });
export const cancelarRecordatorio = (reminder_id) => n8n("reminder-create", { reminder_id, cancel: true });
export const reprogramar = (reminder_id, scheduled_for) => n8n("reminder-create", { reminder_id, scheduled_for, cancel: false });
export const enviarAhora = (reminder_id) => n8n("reminder-send-now", { reminder_id });
export const enviarMensaje = (phone, message) => n8n("send-message", { chat_id: phone, message });
export const cambiarNoe = (phone, encendida) => n8n("bot-toggle", { chat_id: phone, bot_enabled: encendida });

// Solo las conversaciones de personas a las que Nairobi cobra (ficha de cobranza o cobro desde la app):
// el número es personal y por él entran chats de familia y amigos que esta app no debe mostrar.
export async function leerRespuestas() {
  if (DEMO) return demo.conversaciones;
  const rows = await q(supabase.from("conversations")
    .select("id, should_respond, metadata, contacts(id, name, phone, metadata), messages(id, message_text, direction, created_at, metadata)")
    .neq("status", "resolved")
    .order("created_at", { foreignTable: "messages", ascending: false })
    .limit(40, { foreignTable: "messages" })
    .limit(300));
  return (rows || [])
    .filter((c) => c.contacts?.metadata?.cobros || c.contacts?.metadata?.ficha_cobranza)
    .map((c) => ({ ...c, messages: [...(c.messages || [])].reverse() }))
    .sort((a, b) => String(b.messages.at(-1)?.created_at || "").localeCompare(String(a.messages.at(-1)?.created_at || "")));
}

// ── Datos de ejemplo (solo modo demo) ───────────────────────────────────────────────────────────────
const demo = (() => {
  const hoy = diaClave(new Date());
  const contactos = [
    { id: "d1", name: "María Fernanda López", phone: "584141234567" },
    { id: "d2", name: "Luis Daniel Valero", phone: "584245742374" },
    { id: "d3", name: "Carmen Rojas", phone: "584125550011" },
  ];
  const cobro = (clave, concepto, m, cuando, extra = {}) => ({ clave, concepto, monto_texto: m, cuenta_texto: "Pago móvil · Banco Fondo Común", cuando, ...extra });
  const rec = (id, ct, dia, hora, status, concepto, m, extra = {}) => {
    const cuando = aISO(dia, hora);
    const clave = `app-${id}`;
    ct.metadata = { cobros: { ...(ct.metadata?.cobros || {}), [clave]: cobro(clave, concepto, m, cuando, extra) } };
    return { id, window_key: clave, scheduled_for: cuando, sent_at: status === "sent" ? cuando : null, status, error: null,
             message_text: `Saludos ${ct.name.split(" ")[0]}! Dios le bendiga 🙏\n\nLe escribe Noe, asistente de Nairobi Montilla. Le recuerdo el pago de *${concepto}*: *${m}*.`,
             contacts: ct };
  };
  const [a, b, c] = contactos.map((x) => ({ ...x }));
  const recordatorios = [
    rec("r1", b, sumarDias(hoy, -1), "10:00", "sent", "Seguros Constitución, giro 6", "162,31 $"),
    rec("r2", a, hoy, "15:00", "pending", "Póliza RCV de su moto", "45,00 $"),
    rec("r3", c, sumarDias(hoy, 2), "09:00", "pending", "Fianza de fiel cumplimiento", "120,00 $"),
  ];
  const conversaciones = [{
    id: "cv1", should_respond: true, metadata: {}, contacts: b,
    messages: [
      { id: "m1", direction: "outbound", created_at: aISO(sumarDias(hoy, -1), "10:00"), message_text: recordatorios[0].message_text },
      { id: "m2", direction: "inbound", created_at: aISO(sumarDias(hoy, -1), "10:42"), message_text: "Buenos días señora Nairobi, ya le hago el pago móvil." },
      { id: "m3", direction: "outbound", created_at: aISO(sumarDias(hoy, -1), "10:43"), message_text: "Perfecto, Luis. Cuando lo haga me envía la captura por aquí y Nairobi le confirma. Siempre a la orden!" },
    ],
  }];
  const store = { contactos, recordatorios, conversaciones, cuentas: [...CUENTAS_INICIALES] };
  store.n8n = async (resource, body) => {
    await new Promise((r) => setTimeout(r, 650));
    if (resource === "metodos-pago") store.cuentas = body.metodos;
    if (resource === "cobro-programar") {
      const ct = { id: `c${Date.now()}`, name: body.name, phone: body.phone, metadata: { cobros: { [`app-${body.clave}`]: { ...body.cobro, clave: `app-${body.clave}` } } } };
      store.recordatorios = [...store.recordatorios, { id: `r${Date.now()}`, window_key: `app-${body.clave}`, scheduled_for: body.scheduled_for,
        status: "pending", message_text: body.message_text, contacts: ct }].sort((x, y) => x.scheduled_for.localeCompare(y.scheduled_for));
    }
    const r = store.recordatorios.find((x) => x.id === body.reminder_id);
    if (resource === "reminder-create" && r) Object.assign(r, body.cancel ? { status: "skipped" } : { scheduled_for: body.scheduled_for });
    if (resource === "reminder-send-now" && r) Object.assign(r, { status: "sent", sent_at: new Date().toISOString() });
    if (resource === "cobro-pagado") {
      const x = store.recordatorios.find((y) => y.window_key === body.clave);
      if (x) {
        if (x.status === "pending") x.status = "skipped";
        x.contacts.metadata.cobros[body.clave].pagado = new Date().toLocaleDateString("es-VE");
      }
    }
    if (resource === "send-message") {
      const cv = store.conversaciones.find((y) => y.contacts.phone === body.chat_id);
      cv?.messages.push({ id: `m${Date.now()}`, direction: "outbound", created_at: new Date().toISOString(), message_text: body.message, metadata: { sent_by: "nairobi" } });
    }
    if (resource === "bot-toggle") {
      const cv = store.conversaciones.find((y) => y.contacts.phone === body.chat_id);
      if (cv) cv.should_respond = body.bot_enabled;
    }
    return { ok: true };
  };
  return store;
})();

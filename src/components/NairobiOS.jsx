import React, { useState, useMemo, useEffect } from "react";
import {
  Home, Users, FileText, ShieldCheck, AlertTriangle, DollarSign, Calendar,
  MessageSquare, Building2, Percent, BarChart3, Settings, Bell,
  Phone, Mail, Sparkles, Bot, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Send, Paperclip, Smile, MoreVertical, ChevronRight, Plus, Filter, X,
  Link2, Zap, KeyRound, Save, RefreshCw, Star, Flag, ArrowUpRight,
  ArrowDownRight, ListFilter, Wifi, WifiOff, Loader2, Check, MapPin,
  FileCheck2, CircleDot, User as UserIcon, Menu, LogOut
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

/* ---------------------------------- DATA ---------------------------------- */

const NAV = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "cotizaciones", label: "Cotizaciones", icon: FileText },
  { id: "polizas", label: "Pólizas", icon: ShieldCheck },
  { id: "siniestros", label: "Siniestros", icon: AlertTriangle },
  { id: "cobranzas", label: "Cobranzas", icon: DollarSign },
  { id: "citas", label: "Citas", icon: Calendar },
  { id: "mensajes", label: "Mensajes", icon: MessageSquare },
  { id: "aseguradoras", label: "Aseguradoras", icon: Building2 },
  { id: "comisiones", label: "Comisiones", icon: Percent },
  { id: "reportes", label: "Reportes", icon: BarChart3 },
  { id: "configuracion", label: "Configuración", icon: Settings },
];

// Nota: la plataforma no contiene datos de ejemplo/ficticios. Estas listas
// arrancan vacías y se alimentan de Supabase (o quedan en 0 / "Sin datos")
// hasta que existan registros reales.
const REVENUE_TREND = [];

const INSURERS = [];

const QUOTE_INSURERS = [];

const CLIENTS = [];

const POLICIES = [];

const CLAIMS = [];

const CONVERSATIONS = [];

const APPOINTMENTS = [];

const COLLECTIONS = [];

const COMMISSIONS = [];

// Traducen los valores reales de los campos "status" (en inglés, definidos por
// check constraints en supabase/migration_02_core_tables.sql) a las etiquetas
// en español que ya usa STATUS_STYLES — sin inventar estados nuevos.
const CLAIM_STATUS_LABEL = {
  reported: "Nuevo", documents_pending: "Documentación Pendiente", submitted: "En Proceso",
  in_review: "En Revisión", approved: "Resuelto", paid: "Resuelto", closed: "Resuelto", rejected: "Escalado",
};
const QUOTE_STATUS_LABEL = {
  draft: "Prospecto", completed: "Nuevo", partial: "En Proceso", manual_pending: "En Proceso",
  sent: "En Proceso", accepted: "Activo", rejected: "Escalado", expired: "Vencido",
};
const POLICY_STATUS_LABEL = {
  pending: "Próximo", active: "Activa", lapsed: "Por Vencer", cancelled: "Vencido", renewed: "Activa",
};
const PAYMENT_STATUS_LABEL = {
  pending: "Próximo", paid: "Activo", overdue: "Vencido", waived: "Resuelto", failed: "Vencido",
};
const APPT_STATUS_LABEL = {
  scheduled: "Nuevo", confirmed: "Activo", cancelled: "Vencido", completed: "Resuelto", no_show: "Vencido",
};
const COMMISSION_STATUS_LABEL = {
  accrued: "En Proceso", invoiced: "Próximo", collected: "Activo", cancelled: "Vencido",
};

/* --------------------------------- HELPERS --------------------------------- */

const STATUS_STYLES = {
  Activo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Activa: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Resuelto: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Nuevo: "bg-blue-50 text-blue-700 ring-blue-200",
  "En Proceso": "bg-amber-50 text-amber-700 ring-amber-200",
  "En Revisión": "bg-amber-50 text-amber-700 ring-amber-200",
  "Documentación Pendiente": "bg-amber-50 text-amber-700 ring-amber-200",
  "Por Vencer": "bg-amber-50 text-amber-700 ring-amber-200",
  "Próximo": "bg-amber-50 text-amber-700 ring-amber-200",
  Prospecto: "bg-slate-100 text-slate-600 ring-slate-200",
  Urgente: "bg-red-50 text-red-700 ring-red-200",
  Vencido: "bg-red-50 text-red-700 ring-red-200",
  Escalado: "bg-red-50 text-red-700 ring-red-200",
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}

function EmptyState({ icon: Icon = CircleDot, title = "Sin datos todavía", subtitle = "Esta sección se llenará automáticamente cuando existan registros reales." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-300">
        <Icon size={17} />
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="max-w-xs text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function NaiTag({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-100">
      <Sparkles size={11} strokeWidth={2.5} /> {children}
    </span>
  );
}

function Card({ children, className = "", title, action, icon: Icon }) {
  return (
    <div className={`rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} className="text-slate-400" />}
            <h3 className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
          </div>
          {action}
        </div>
      )}
      <div className={title ? "p-5 pt-3" : "p-5"}>{children}</div>
    </div>
  );
}

function StatCard({ label, value, delta, deltaLabel, sub }) {
  const positive = delta && delta > 0;
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
      <p className="text-[12px] font-medium text-slate-400">{label}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-2xl font-semibold text-slate-800 tabular-nums">{value}</p>
        {delta !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-500"}`}>
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function PageHeader({ title, subtitle, right }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-slate-800 sm:text-xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

function PrimaryButton({ children, onClick, icon: Icon, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] ${className}`}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function Toggle({ on, onClick, label }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2">
      {label && <span className="text-sm text-slate-600">{label}</span>}
      <span className={`relative h-5 w-9 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${on ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/* ---------------------------------- SHELL ---------------------------------- */

function Sidebar({ active, setActive, open, setOpen }) {
  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/30 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 -translate-x-full flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 md:static md:z-auto md:w-60 md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm shadow-sm">N</div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Centro Administrativo</p>
              <p className="-mt-0.5 text-[15px] font-semibold text-slate-800">Nairobi</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 md:hidden">
            <X size={18} />
          </button>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActive(item.id); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <Icon size={16.5} strokeWidth={isActive ? 2.4 : 2} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mx-3 mb-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Bot size={14} className="text-indigo-500" /> Nai Agente
          </div>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">Supervisando flujos vía n8n.</p>
        </div>
      </aside>
    </>
  );
}

function TopBar({ title, onMenu, userEmail, onSignOut, onBell }) {
  // La campana mostraba un punto rojo fijo, sin nada detrás. Ahora cuenta
  // escalaciones sin resolver reales y lleva a la bandeja al hacer clic.
  const [pendientes, setPendientes] = useState(0);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("escalations")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null)
      .then(({ count }) => setPendientes(count || 0));
  }, []);

  const initials = (userEmail || "Usuario")
    .split(/[@ ]/)[0]
    .split(/[.\s]/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-3 py-3 backdrop-blur sm:px-6 sm:py-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button onClick={onMenu} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50 md:hidden">
          <Menu size={19} />
        </button>
        <h1 className="min-w-0 truncate text-sm font-semibold text-slate-600">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          onClick={onBell}
          title={pendientes ? `${pendientes} escalación(es) sin resolver` : "Sin escalaciones pendientes"}
          className="relative rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <Bell size={17} />
          {pendientes > 0 && (
            <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
              {pendientes > 9 ? "9+" : pendientes}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-1 ring-1 ring-slate-200/70 sm:pr-2">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-[11px] font-semibold text-white">{initials}</div>
          <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-600 sm:inline">{userEmail || "Usuario"}</span>
          <button onClick={onSignOut} title="Cerrar sesión" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------- PAGES ---------------------------------- */

// Estados que cuentan como "todavía abierto" en cada tabla. Salen de los check
// constraints reales de supabase/migration_02_core_tables.sql — no se inventan.
const CLAIM_ABIERTO = ["reported", "documents_pending", "submitted", "in_review"];
const QUOTE_CERRADA = ["accepted", "rejected", "expired"];

function InicioPage({ setActive }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const iniHoy = new Date(); iniHoy.setHours(0, 0, 0, 0);
    const finHoy = new Date(); finHoy.setHours(23, 59, 59, 999);
    const iniMes = new Date(); iniMes.setDate(1); iniMes.setHours(0, 0, 0, 0);
    const hace30d = new Date(Date.now() - 30 * 864e5);

    Promise.all([
      supabase.from("appointments").select("id, title, purpose, starts_at, status, contacts(name, phone)")
        .gte("starts_at", iniHoy.toISOString()).lte("starts_at", finHoy.toISOString()),
      supabase.from("claims").select("id, status, severity, incident_type, reported_at, contacts(name, phone)"),
      supabase.from("payments").select("id, amount, currency, due_date, status, contacts(name, phone)"),
      supabase.from("quotes").select("id, status, created_at, contacts(name, phone)"),
      supabase.from("policies").select("id, status, premium_total"),
      supabase.from("commissions").select("id, net_amount, status, collected_at"),
      supabase.from("escalations").select("id, reason, urgency, resolved_at, created_at, contacts(name, phone)"),
      supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 864e5).toISOString()),
      supabase.from("insurers").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]).then(([citas, claims, pagos, quotes, pols, coms, escs, msgs, asegs]) => {
      const primerError = [citas, claims, pagos, quotes, pols, coms, escs].find((r) => r.error);
      if (primerError) { setErr(primerError.error.message); return; }
      const c = claims.data || [], p = pagos.data || [], q = quotes.data || [];
      const po = pols.data || [], co = coms.data || [], es = (escs.data || []).filter((e) => !e.resolved_at);

      const claimsAbiertos = c.filter((x) => CLAIM_ABIERTO.includes(x.status));
      const vencidos = p.filter((x) => x.status === "overdue");
      const proximos = p.filter((x) => x.status === "pending");
      const quotesNuevas = q.filter((x) => !QUOTE_CERRADA.includes(x.status) && new Date(x.created_at) >= hace30d);
      const manualPending = q.filter((x) => x.status === "manual_pending");
      const sum = (arr, k) => arr.reduce((s, x) => s + Number(x[k] || 0), 0);

      // Atención prioritaria: se arma solo con hechos reales de la base.
      const alerts = [];
      for (const e of es.slice(0, 3)) {
        alerts.push({ icon: Flag, tone: "bg-red-50 text-red-600",
          text: `Escalación pendiente de ${e.contacts?.name || e.contacts?.phone || "un cliente"}: ${e.reason || "sin motivo registrado"}.`, go: "mensajes" });
      }
      for (const x of c.filter((x) => ["severe", "fatal"].includes(x.severity) && CLAIM_ABIERTO.includes(x.status)).slice(0, 3)) {
        alerts.push({ icon: AlertTriangle, tone: "bg-red-50 text-red-600",
          text: `Siniestro grave sin cerrar (${x.incident_type || "sin tipo"}) de ${x.contacts?.name || x.contacts?.phone || "un cliente"}.`, go: "siniestros" });
      }
      if (vencidos.length) alerts.push({ icon: DollarSign, tone: "bg-red-50 text-red-600",
        text: `${vencidos.length} pago(s) vencido(s) por $${sum(vencidos, "amount").toLocaleString()}.`, go: "cobranzas" });
      if (manualPending.length) alerts.push({ icon: FileText, tone: "bg-amber-50 text-amber-600",
        text: `${manualPending.length} cotización(es) esperan tarifa manual — ninguna aseguradora devolvió precio.`, go: "cotizaciones" });

      setD({
        alerts,
        citasHoy: citas.data || [],
        claimsAbiertos: claimsAbiertos.length,
        claimsResueltos: c.length - claimsAbiertos.length,
        pagosProximos: proximos.length,
        pagosVencidos: vencidos.length,
        quotesNuevas: quotesNuevas.length,
        quotesGanadas: q.filter((x) => x.status === "accepted").length,
        gananciasMes: sum(co.filter((x) => x.status === "collected" && x.collected_at && new Date(x.collected_at) >= iniMes), "net_amount"),
        comisionesAcum: sum(co.filter((x) => x.status !== "cancelled"), "net_amount"),
        polizasActivas: po.filter((x) => x.status === "active").length,
        primaTotal: sum(po, "premium_total"),
        mensajes24h: msgs.count ?? 0,
        asegurActivas: asegs.count ?? 0,
      });
    });
  }, []);

  const alerts = d?.alerts || [];
  const n = (v) => (d ? v : "…");
  return (
    <div>
      <PageHeader
        title="Buenos días, Nairobi."
        subtitle={err ? `No se pudo cargar el resumen: ${err}` : "Tienes el control total de tu operación."}
      />
      <div className="flex flex-col gap-5 md:grid md:grid-cols-3">
        <div className="space-y-5 md:col-span-2">
          <Card title="Atención Prioritaria" icon={Sparkles} action={<NaiTag>Highlights inteligentes de Nai</NaiTag>}>
            {alerts.length === 0 ? (
              <EmptyState icon={Sparkles} title="Sin alertas activas" subtitle="Cuando Nai detecte seguimientos, pólizas por vencer o siniestros urgentes, aparecerán aquí." />
            ) : (
              <div className="space-y-2.5">
                {alerts.map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => a.go && setActive(a.go)}
                      className="flex w-full items-start gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:bg-slate-50"
                    >
                      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${a.tone}`}>
                        <Icon size={15} />
                      </div>
                      <p className="pt-1 text-sm text-slate-600">{a.text}</p>
                      <ChevronRight size={15} className="ml-auto mt-1.5 shrink-0 text-slate-300" />
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Operación de Hoy" icon={CircleDot}>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { l: "Citas", v: `${n(d?.citasHoy.length ?? 0)} hoy`, s: d?.citasHoy.length ? d.citasHoy.map((c) => new Date(c.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })).join(", ") : "Sin citas agendadas", go: "citas" },
                { l: "Siniestros Activos", v: `${n(d?.claimsAbiertos ?? 0)} Abiertos`, s: `${n(d?.claimsResueltos ?? 0)} Resueltos`, go: "siniestros" },
                { l: "Cobranzas", v: `${n(d?.pagosProximos ?? 0)} Pagos Próximos`, s: `${n(d?.pagosVencidos ?? 0)} Vencidos`, go: "cobranzas" },
                { l: "Cotizaciones", v: `${n(d?.quotesNuevas ?? 0)} Nuevas`, s: `${n(d?.quotesGanadas ?? 0)} Ganadas`, go: "cotizaciones" },
              ].map((x) => (
                <button key={x.l} onClick={() => setActive(x.go)} className="rounded-lg text-left transition hover:bg-slate-50">
                  <p className="text-xs text-slate-400">{x.l}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{x.v}</p>
                  <p className="truncate text-xs text-slate-400">{x.s}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Bandeja rápida" icon={MessageSquare}>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
              <input placeholder="Entra a un mensaje..." className="flex-1 bg-transparent text-sm text-slate-500 placeholder:text-slate-400 focus:outline-none" />
              <button onClick={() => setActive("mensajes")} className="rounded-lg bg-blue-600 p-1.5 text-white"><Send size={14} /></button>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Resumen Financiero" icon={DollarSign}>
            <div className="space-y-3">
              <StatCard label="Ganancias del Mes" value={`$${n((d?.gananciasMes ?? 0).toLocaleString())}`} sub="Comisiones cobradas este mes" />
              <StatCard label="Comisiones Acumuladas" value={`$${n((d?.comisionesAcum ?? 0).toLocaleString())}`} />
              <StatCard label="Pólizas Activas" value={String(n(d?.polizasActivas ?? 0))} sub={`$${(d?.primaTotal ?? 0).toLocaleString()} en prima emitida`} />
            </div>
          </Card>

          <Card title="Nai Trabaja. Tú Decides." icon={Bot}>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2"><Clock size={15} className="mt-0.5 shrink-0 text-slate-400" />
                {d ? `${d.mensajes24h} mensaje(s) procesados en las últimas 24 h.` : "Cargando actividad de Nai…"}</li>
              <li className="flex gap-2"><Link2 size={15} className="mt-0.5 shrink-0 text-indigo-500" />Integraciones: estado real disponible en Configuración.</li>
              <li className="flex gap-2"><Building2 size={15} className="mt-0.5 shrink-0 text-slate-400" />
                {d ? `${d.asegurActivas} aseguradora(s) activas para cotizar.` : "Consultando aseguradoras…"}</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

// El toggle "Automatizado/Manual" y el estado del sistema hablan con n8n vía
// el recurso bot-toggle de W8 (Webhook App Web) — nunca escriben directo a
// Supabase (misma regla que ConfiguracionPage: n8n es el único escritor).
const N8N_APP_WEB_URL = import.meta.env.VITE_N8N_APP_WEB_URL || "";
const N8N_APP_WEB_SECRET = import.meta.env.VITE_N8N_APP_WEB_SECRET || "";

async function callAppWebApi(resource, body) {
  if (!N8N_APP_WEB_URL) throw new Error("VITE_N8N_APP_WEB_URL no configurado");
  const res = await fetch(`${N8N_APP_WEB_URL.replace(/\/$/, "")}/${resource}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(N8N_APP_WEB_SECRET ? { "x-app-web-secret": N8N_APP_WEB_SECRET } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  // W8 responde 400 con { ok:false, error } cuando el dato es inválido (por
  // ejemplo un teléfono ilegible). Ese texto está escrito para que Nairobi lo
  // entienda, así que se propaga tal cual en vez de "n8n respondió 400".
  if (!res.ok) throw new Error(data?.error || `n8n respondió ${res.status}`);
  return data;
}

// Traduce el resultado real del clasificador de W2 (metadata.classification)
// y de la compuerta de respuesta (metadata.gate) a algo legible — mismos
// campos que persiste "Aplicar compuerta" en workflows/w2_cerebro_nai.json.
function GateBadge({ classification, gate }) {
  if (gate && gate.replied === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
        <WifiOff size={10} /> Silenciado — {gate.reason || "sin motivo registrado"}
      </span>
    );
  }
  if (classification?.scope) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 ring-1 ring-inset ring-indigo-100">
        <Sparkles size={10} /> {classification.intent || classification.scope} · {Math.round((classification.confidence ?? 0) * 100)}%
      </span>
    );
  }
  return null;
}

function MensajesPage() {
  const [conversations, setConversations] = useState(CONVERSATIONS);
  const [selected, setSelected] = useState(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [toggling, setToggling] = useState(false);
  const [ocultas, setOcultas] = useState(0);
  const [verTodas, setVerTodas] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [enviando, setEnviando] = useState(false);
  const isMobile = useIsMobile();

  // El WhatsApp que alimenta a Nai es un número personal: por él entran también
  // conversaciones privadas (familia, amigos) que no son del negocio. La bandeja
  // solo debe mostrar lo que es trabajo de la corredora — nadie que abra este
  // panel tiene por qué leer los chats personales de nadie.
  function esConversacionDeNegocio(c) {
    if (c.metadata?.nai_enabled === true) return true;              // la compuerta la abrió
    if ((c.contacts?.policies || []).length > 0) return true;       // cliente con póliza
    return (c.messages || []).some(
      (m) => m.direction === "outbound" || esSenalDeNegocio(m.metadata?.classification),
    );
  }

  function loadConversations() {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    supabase
      .from("conversations")
      .select("id, status, should_respond, metadata, created_at, contacts(phone, policies(id)), messages(id, message_text, direction, metadata, created_at)")
      .order("created_at", { ascending: false })
      .order("created_at", { foreignTable: "messages", ascending: true })
      .limit(30)
      .then(({ data, error }) => {
        setLoading(false);
        if (error) { setErr(error.message); return; }
        if (!data) return;
        const negocio = data.filter(esConversacionDeNegocio);
        setOcultas(data.length - negocio.length);
        const mapped = (verTodas ? data : negocio).map((c) => {
          const msgs = c.messages || [];
          const last = msgs[msgs.length - 1];
          return {
            id: c.id,
            cliente: c.contacts?.phone ? `+${c.contacts.phone}` : "Cliente",
            telefono: c.contacts?.phone || "—",
            estado: c.status === "active" ? "Activo" : c.status === "resolved" ? "Resuelto" : c.status || "Nuevo",
            should_respond: c.should_respond !== false,
            hora: last?.created_at ? new Date(last.created_at).toLocaleTimeString() : "",
            resumen: last?.message_text ? last.message_text.slice(0, 60) : "Sin mensajes todavía",
            thread: msgs.map((m) => ({
              id: m.id,
              from: m.direction === "inbound" ? "client" : "nai",
              text: m.message_text,
              classification: m.metadata?.classification,
              gate: m.metadata?.gate,
            })),
          };
        });
        setConversations(mapped);
        setSelected((prev) => mapped.find((m) => m.id === prev?.id) || mapped[0] || null);
        setLive(true);
      });
  }

  useEffect(() => { loadConversations(); }, [verTodas]);

  async function toggleBot(conv) {
    if (!conv?.telefono || conv.telefono === "—") return;
    setToggling(true);
    try {
      await callAppWebApi("bot-toggle", { chat_id: conv.telefono, bot_enabled: !conv.should_respond });
      loadConversations();
    } catch (e) {
      setErr(`No se pudo cambiar el modo vía n8n: ${e.message}`);
    } finally {
      setToggling(false);
    }
  }

  // Respuesta manual de Nairobi desde el panel. Sale por el mismo recurso
  // send-message de W8 que ya usan Cotizaciones y Siniestros — el panel nunca
  // habla con WhatsApp directamente.
  async function enviarManual() {
    const texto = borrador.trim();
    if (!texto || !selected?.telefono || selected.telefono === "—") return;
    setEnviando(true);
    setErr("");
    try {
      const res = await callAppWebApi("send-message", { chat_id: selected.telefono, message: texto });
      if (res.ok === false) throw new Error(res.error || "n8n rechazó el envío");
      setBorrador("");
      loadConversations();
    } catch (e) {
      setErr(`No se pudo enviar: ${e.message}`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Centro de Mensajes Inteligente"
        subtitle={
          live
            ? "Bandeja en vivo — sincronizada con Supabase (public.conversations / public.messages)."
            : isSupabaseConfigured
            ? loading ? "Cargando desde Supabase…" : err ? `No se pudo leer conversations: ${err}` : "Sin conversaciones en Supabase todavía."
            : "Bandeja de entrada unificada de WhatsApp, supervisada por Nai (conecta Supabase en .env)."
        }
      />
      {ocultas > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
          <ShieldCheck size={13} className="text-slate-400" />
          <span>
            {verTodas
              ? `Mostrando también ${ocultas} conversación(es) personal(es), ajenas al negocio.`
              : `${ocultas} conversación(es) personal(es) ocultas — solo se muestra lo que es trabajo de la corredora.`}
          </span>
          <button onClick={() => setVerTodas((v) => !v)} className="ml-auto font-medium text-slate-600 underline underline-offset-2">
            {verTodas ? "Ocultarlas" : "Ver todas"}
          </button>
        </div>
      )}
      {!selected ? (
        <EmptyState icon={MessageSquare} title="Sin conversaciones todavía" subtitle="En cuanto lleguen mensajes de WhatsApp a través de n8n, aparecerán aquí." />
      ) : (
      <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:gap-5" style={isMobile ? undefined : { height: "calc(100vh - 190px)" }}>
        <div className="flex max-h-96 flex-col rounded-2xl bg-white ring-1 ring-slate-200/70 md:col-span-3 md:max-h-none">
          <div className="flex items-center justify-between border-b border-slate-100 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conversaciones</span>
            <ListFilter size={14} className="text-slate-400" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`block w-full border-b border-slate-50 p-3 text-left transition ${selected.id === c.id ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{c.cliente}</span>
                  <span className="text-[11px] text-slate-400">{c.hora}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">{c.resumen}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <StatusBadge status={c.estado} />
                  {!c.should_respond && (
                    <span className="text-[10px] font-medium text-amber-600">Nai en pausa</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-96 flex-col rounded-2xl bg-white ring-1 ring-slate-200/70 md:col-span-6 md:min-h-0">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{selected.cliente}</p>
              <p className="text-xs text-slate-400">{selected.thread.length} mensajes</p>
            </div>
            <MoreVertical size={16} className="text-slate-400" />
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {selected.thread.map((m, i) => (
              <div key={m.id ?? i} className={`flex flex-col ${m.from === "client" ? "items-start" : "items-end"}`}>
                {m.from === "nai" ? (
                  <div className="max-w-[75%] rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-sm text-indigo-700">
                    <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold"><Sparkles size={11} />Nai</div>
                    {m.text}
                  </div>
                ) : (
                  <div className="max-w-[75%] rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{m.text}</div>
                )}
                {(m.classification || m.gate) && (
                  <div className="mt-1"><GateBadge classification={m.classification} gate={m.gate} /></div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Smile size={16} className="text-slate-400" />
              <Paperclip size={16} className="text-slate-400" />
              <input
                value={borrador}
                onChange={(e) => setBorrador(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !enviando) enviarManual(); }}
                placeholder={enviando ? "Enviando…" : "Escribe un mensaje..."}
                disabled={enviando}
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
              <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                <Toggle
                  on={selected.should_respond}
                  onClick={() => !toggling && toggleBot(selected)}
                  label={toggling ? "..." : selected.should_respond ? "Automatizado" : "Manual"}
                />
                <button
                  onClick={enviarManual}
                  disabled={enviando || !borrador.trim()}
                  title="Enviar por WhatsApp"
                  className="rounded-lg bg-blue-600 p-1.5 text-white disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 md:col-span-3 md:overflow-y-auto">
          <Card title="Contexto del Cliente" icon={UserIcon}>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2"><Phone size={13} className="text-slate-400" />{selected.telefono || "—"}</p>
            </div>
          </Card>
          <Card title="Control de Nai" icon={Zap}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                {selected.should_respond ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-amber-500" />}
                Respuesta automática
              </span>
              <Toggle on={selected.should_respond} onClick={() => !toggling && toggleBot(selected)} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {selected.should_respond
                ? "Nai responde automáticamente en esta conversación."
                : "Nai está en pausa aquí — solo tú puedes responder hasta que la reactives."}
            </p>
            {!N8N_APP_WEB_URL && (
              <p className="mt-2 text-[11px] text-amber-600">VITE_N8N_APP_WEB_URL no está configurado — el toggle no puede llegar a n8n.</p>
            )}
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}

// Modal genérico para los formularios "crear X" que hablan con W8. Nunca
// escribe directo a Supabase — solo hace POST al webhook de n8n
// correspondiente (misma arquitectura que ConfiguracionPage/MensajesPage).
function CreateModal({ title, fields, resource, onClose, onCreated }) {
  const [values, setValues] = useState(Object.fromEntries(fields.map((f) => [f.name, f.default || ""])));
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errMsg, setErrMsg] = useState("");
  // Opciones que vienen de la base (aseguradoras, productos): el formulario
  // muestra el nombre y manda el id real, sin que haya que teclear UUIDs.
  const [remote, setRemote] = useState({});

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    for (const f of fields.filter((x) => x.loadOptions)) {
      const { table, valueCol, labelCol, eq } = f.loadOptions;
      let qb = supabase.from(table).select(`${valueCol}, ${labelCol}`).order(labelCol);
      if (eq) qb = qb.eq(eq[0], eq[1]);
      qb.then(({ data }) => {
        const opts = (data || []).map((r) => ({ value: r[valueCol], label: r[labelCol] }));
        setRemote((m) => ({ ...m, [f.name]: opts }));
        if (opts.length) setValues((v) => (v[f.name] ? v : { ...v, [f.name]: opts[0].value }));
      });
    }
  }, []);

  async function submit() {
    setStatus("loading");
    try {
      // <input type="datetime-local"> no trae zona horaria (ej. "2026-08-25T14:30");
      // se convierte a ISO real con la zona del navegador antes de mandarlo a n8n.
      const payload = { ...values };
      for (const f of fields) {
        if (f.type === "datetime-local" && payload[f.name]) {
          payload[f.name] = new Date(payload[f.name]).toISOString();
        }
      }
      const res = await callAppWebApi(resource, payload);
      if (!res?.ok) throw new Error(res?.error || "n8n respondió sin éxito");
      setStatus("success");
      onCreated?.();
      setTimeout(onClose, 900);
    } catch (e) {
      setStatus("error");
      setErrMsg(e.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="mb-1 block text-xs font-medium text-slate-500">{f.label}</label>
              {f.type === "select" || f.loadOptions ? (
                <select
                  value={values[f.name]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                >
                  {(f.loadOptions ? (remote[f.name] || []) : f.options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)))
                    .map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={f.type || "text"}
                  placeholder={f.placeholder}
                  value={values[f.name]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>
        <button
          onClick={submit}
          disabled={status === "loading"}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Crear
        </button>
        {status === "success" && <p className="mt-2 text-center text-xs text-emerald-600">Creado correctamente.</p>}
        {status === "error" && <p className="mt-2 text-center text-xs text-red-500">No se pudo crear: {errMsg}</p>}
        {!N8N_APP_WEB_URL && <p className="mt-2 text-center text-xs text-amber-600">VITE_N8N_APP_WEB_URL no configurado — este formulario no puede llegar a n8n.</p>}
      </div>
    </div>
  );
}

function SiniestrosPage() {
  const [rows, setRows] = useState(CLAIMS);
  const [selected, setSelected] = useState(null);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [aviso, setAviso] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fAseguradora, setFAseguradora] = useState("");
  const [fTexto, setFTexto] = useState("");

  const visibles = rows.filter((r) => {
    if (fEstado && r.estado !== fEstado) return false;
    if (fAseguradora && r.aseguradora !== fAseguradora) return false;
    const q = fTexto.trim().toLowerCase();
    if (q && !`${r.cliente} ${r.tipo} ${r.poliza}`.toLowerCase().includes(q)) return false;
    return true;
  });

  // Avisa al cliente por WhatsApp en qué va su siniestro, usando el mismo
  // canal que Nai (W8 → send-message → Evolution). El panel no envía nada
  // por su cuenta.
  async function notificarCliente() {
    if (!selected?.telefono) return;
    setAviso("Enviando…");
    try {
      const res = await callAppWebApi("send-message", {
        chat_id: selected.telefono,
        message: `Hola ${selected.cliente}, te escribo por tu siniestro (${selected.tipo}). Estado actual: ${selected.estado}. Cualquier duda, aquí estoy.`,
      });
      setAviso(res?.ok ? "Mensaje enviado al cliente." : `No se pudo enviar: ${res?.error || "error de n8n"}`);
    } catch (e) {
      setAviso(`No se pudo enviar: ${e.message}`);
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("claims")
      .select("id, status, severity, incident_type, amount_claimed, reported_at, contacts(name, phone), policies(policy_number, insurers(name))")
      .order("reported_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) { setErr(error.message); return; }
        if (!data) return;
        const mapped = data.map((c) => ({
          id: c.id,
          cliente: c.contacts?.name || c.contacts?.phone || "Cliente",
          telefono: c.contacts?.phone || "",
          poliza: c.policies?.policy_number || "—",
          tipo: c.incident_type || "Sin especificar",
          aseguradora: c.policies?.insurers?.name || "—",
          fecha: c.reported_at ? new Date(c.reported_at).toLocaleDateString() : "—",
          estado: CLAIM_STATUS_LABEL[c.status] || c.status,
          prioridad: c.severity === "severe" || c.severity === "fatal" ? "Urgente" : c.severity === "moderate" ? "Media" : "Baja",
        }));
        setRows(mapped);
        setLive(true);
      });
  }, [reloadTick]);

  return (
    <div>
      {showCreate && (
        <CreateModal
          title="Crear Nuevo Siniestro"
          resource="claim-create"
          fields={[
            { name: "chat_id", label: "Teléfono del cliente (debe existir en Clientes)", placeholder: "584121234567" },
            { name: "incident_type", label: "Tipo de siniestro", placeholder: "choque, robo, incendio..." },
            { name: "description", label: "Descripción", placeholder: "Qué pasó" },
            { name: "severity", label: "Severidad", type: "select", options: ["unknown", "minor", "moderate", "severe", "fatal"], default: "unknown" },
          ]}
          onClose={() => setShowCreate(false)}
          onCreated={() => setReloadTick((t) => t + 1)}
        />
      )}
      <PageHeader
        title="Centro de Siniestros"
        subtitle={live ? "Datos en vivo desde Supabase (tabla claims)." : "Listado de siniestros (claims list) supervisado por Nai."}
        right={<PrimaryButton icon={Plus} onClick={() => setShowCreate(true)}>Crear Nuevo Siniestro</PrimaryButton>}
      />
      {err && <p className="mb-3 text-xs text-red-500">No se pudo leer claims: {err}</p>}
      {rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Sin siniestros registrados" subtitle="Los siniestros reportados por clientes aparecerán en esta lista." />
      ) : (
      <div className="flex flex-col gap-5 md:grid md:grid-cols-12">
        <div className="overflow-hidden overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200/70 md:col-span-9">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-400"><Filter size={13} />Filtrar</span>
            <select
              value={fEstado}
              onChange={(e) => setFEstado(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 focus:outline-none"
            >
              <option value="">Todos los estados</option>
              {[...new Set(rows.map((r) => r.estado).filter(Boolean))].map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <select
              value={fAseguradora}
              onChange={(e) => setFAseguradora(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 focus:outline-none"
            >
              <option value="">Todas las aseguradoras</option>
              {[...new Set(rows.map((r) => r.aseguradora).filter((a) => a && a !== "—"))].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <input
              value={fTexto}
              onChange={(e) => setFTexto(e.target.value)}
              placeholder="Buscar cliente o tipo..."
              className="ml-auto w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none"
            />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Póliza</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Aseguradora</th>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`cursor-pointer border-b border-slate-50 transition hover:bg-slate-50 ${selected?.id === c.id ? "bg-blue-50/50" : ""}`}
                >
                  <td className="flex items-center gap-2 px-4 py-3">
                    <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                      {c.cliente.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    {c.cliente}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.poliza}</td>
                  <td className="px-4 py-3 text-slate-500">{c.tipo}</td>
                  <td className="px-4 py-3 text-slate-500">{c.aseguradora}</td>
                  <td className="px-4 py-3 text-slate-500">{c.fecha}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.estado} /></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-red-500 text-xs font-medium"><Flag size={12} />{c.prioridad}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 md:col-span-3">
          {selected && (
            <>
              <Card title="Detalle del Siniestro" icon={FileCheck2}>
                <p className="text-sm font-semibold text-slate-800">{selected.cliente}</p>
                <p className="text-xs text-slate-400">{selected.poliza}</p>
                <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                  <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">Resumen automático: siniestro {selected.tipo.toLowerCase()} con {selected.aseguradora}.</p>
                </div>
              </Card>
              <Card className="border-red-100" title="Estado del Siniestro" icon={AlertTriangle}>
                <p className="text-xs text-slate-500">Estado actual: {selected.estado}.</p>
                <button
                  onClick={notificarCliente}
                  disabled={!selected.telefono || aviso === "Enviando…"}
                  className="mt-3 w-full rounded-lg bg-red-600 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Notificar Cliente
                </button>
                {!selected.telefono && <p className="mt-1.5 text-[11px] text-slate-400">Este siniestro no tiene un teléfono asociado.</p>}
                {aviso && <p className="mt-1.5 text-[11px] text-slate-500">{aviso}</p>}
              </Card>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// Pide una cotización real a n8n (W8 → W3). Los campos que se piden no están
// hardcodeados: salen de products.rating_factors, la misma lista que W3 usa
// para decidir si faltan datos — así el formulario nunca queda desalineado.
function QuoteCreateModal({ onClose, onCreated }) {
  const [productos, setProductos] = useState([]);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [inputs, setInputs] = useState({});
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.from("products").select("code, name, rating_factors").eq("is_active", true).order("name")
      .then(({ data }) => {
        setProductos(data || []);
        if (data?.length) setCode(data[0].code);
      });
  }, []);

  const factores = productos.find((p) => p.code === code)?.rating_factors || [];

  async function submit() {
    setStatus("loading"); setMsg("");
    try {
      const res = await callAppWebApi("quote", {
        contact_chat_id: phone,
        product_code: code,
        inputs_json: JSON.stringify(inputs),
      });
      if (!res?.ok) throw new Error(res?.error || "n8n respondió sin éxito");
      const data = res.data || {};
      if (data.result === "need_more_info") {
        setStatus("error");
        setMsg(`Faltan datos: ${(data.missing_fields || []).join(", ")}`);
        return;
      }
      setStatus("success");
      setMsg(data.status === "manual_pending"
        ? "Cotización creada, pero ninguna aseguradora tiene tarifa cargada. Queda para cotizar a mano."
        : "Cotización generada.");
      onCreated?.();
      setTimeout(onClose, 1800);
    } catch (e) {
      setStatus("error"); setMsg(e.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Nueva Cotización</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Teléfono del cliente (debe existir en Clientes)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="584121234567"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Producto</label>
            <select value={code} onChange={(e) => { setCode(e.target.value); setInputs({}); }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
              {productos.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          {factores.map((f) => (
            <div key={f}>
              <label className="mb-1 block text-xs font-medium capitalize text-slate-500">{f.replace(/_/g, " ")}</label>
              <input value={inputs[f] ?? ""} onChange={(e) => setInputs((v) => ({ ...v, [f]: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
          ))}
        </div>
        <button onClick={submit} disabled={status === "loading" || !phone || !code}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          Cotizar
        </button>
        {msg && <p className={`mt-2 text-center text-xs ${status === "success" ? "text-emerald-600" : "text-red-500"}`}>{msg}</p>}
        {!N8N_APP_WEB_URL && <p className="mt-2 text-center text-xs text-amber-600">VITE_N8N_APP_WEB_URL no configurado — este formulario no puede llegar a n8n.</p>}
      </div>
    </div>
  );
}

function CotizacionesPage() {
  const [quotes, setQuotes] = useState([]);
  const [quote, setQuote] = useState(null);
  const [lines, setLines] = useState(QUOTE_INSURERS);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [envio, setEnvio] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("quotes")
      // quote_lines!quote_lines_quote_id_fkey desambigua: hay dos relaciones
      // entre quotes y quote_lines (quote_lines.quote_id → quotes.id, y
      // quotes.best_line_id → quote_lines.id) y PostgREST no puede elegir sola.
      .select("id, status, created_at, recommendation, contacts(name, phone), products(name), quote_lines!quote_lines_quote_id_fkey(id, premium, coverage_sum, commission_pct, rank, unavailable_reason, insurers(name))")
      .order("created_at", { ascending: false })
      .limit(25)
      .then(({ data, error }) => {
        if (error) { setErr(error.message); return; }
        setQuotes(data || []);
        setLive(true);
        if (data?.length) setQuote((prev) => data.find((x) => x.id === prev?.id) || data[0]);
      });
  }, [reloadTick]);

  useEffect(() => {
    const mapped = (quote?.quote_lines || [])
      .filter((l) => l.premium != null)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      .map((l, i) => ({
        key: String.fromCharCode(65 + i),
        name: l.insurers?.name || "—",
        price: `$${l.premium}`,
        coverage: l.coverage_sum ? `$${l.coverage_sum}` : "—",
        commission: l.commission_pct ? `${l.commission_pct}%` : "—",
        score: Math.max(0, 100 - i * 8),
        rec: i === 0 ? "Mejor opción" : `${Math.max(50, 90 - i * 10)}%`,
      }));
    setLines(mapped);
  }, [quote]);

  // "Generar Propuesta" manda al cliente, por WhatsApp, la recomendación real
  // que W3 ya calculó — no genera texto nuevo desde el panel.
  async function enviarPropuesta() {
    if (!quote?.contacts?.phone) { setEnvio("Esta cotización no tiene un teléfono asociado."); return; }
    const mejor = lines[0];
    if (!mejor) { setEnvio("Todavía no hay ninguna opción con precio para proponer."); return; }
    setEnvio("Enviando…");
    try {
      const texto = quote.recommendation
        || `Hola${quote.contacts?.name ? " " + quote.contacts.name : ""}, te comparto la mejor opción que conseguí para tu ${quote.products?.name || "seguro"}: ${mejor.name} por ${mejor.price} al año. ¿Te la reservo?`;
      const res = await callAppWebApi("send-message", { chat_id: quote.contacts.phone, message: texto });
      setEnvio(res?.ok ? "Propuesta enviada al cliente por WhatsApp." : `No se pudo enviar: ${res?.error || "error de n8n"}`);
    } catch (e) {
      setEnvio(`No se pudo enviar: ${e.message}`);
    }
  }

  const chartData = lines.map((q) => ({ name: q.name, Precio: parseInt(q.price.replace("$", "")) || 0, Cobertura: q.score }));
  return (
    <div>
      {showCreate && <QuoteCreateModal onClose={() => setShowCreate(false)} onCreated={() => setReloadTick((t) => t + 1)} />}
      <PageHeader
        title="Comparador de Cotizaciones Multi-Aseguradora"
        subtitle={live
          ? `${quotes.length} cotización(es) registradas${quote ? ` — viendo la de ${quote.contacts?.name || quote.contacts?.phone || "cliente"} (${QUOTE_STATUS_LABEL[quote.status] || quote.status})` : ""}.`
          : "Compara precios y comisiones entre tus aseguradoras conectadas."}
        right={
          <div className="flex gap-2">
            <PrimaryButton icon={Sparkles} onClick={() => setShowCreate(true)}>Nueva Cotización</PrimaryButton>
            <button onClick={enviarPropuesta} disabled={!lines.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              <FileText size={15} /> Generar Propuesta
            </button>
          </div>
        }
      />
      {err && <p className="mb-3 text-xs text-red-500">No se pudo leer quotes: {err}</p>}
      {envio && <p className="mb-3 text-xs text-slate-500">{envio}</p>}

      {quotes.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {quotes.map((q) => (
            <button key={q.id} onClick={() => { setQuote(q); setEnvio(""); }}
              className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition ${
                quote?.id === q.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <p className="font-medium text-slate-700">{q.contacts?.name || q.contacts?.phone || "Cliente"}</p>
              <p className="text-slate-400">{q.products?.name || "—"} · {QUOTE_STATUS_LABEL[q.status] || q.status}</p>
            </button>
          ))}
        </div>
      )}

      {lines.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={quotes.length ? "Esta cotización no tiene opciones con precio" : "Sin cotizaciones activas"}
          subtitle={quotes.length
            ? "Ninguna aseguradora devolvió una tarifa vigente para este producto. Hay que cargar las tarifas o cotizarla a mano."
            : "Crea una con “Nueva Cotización”, o espera a que un cliente la pida por WhatsApp."}
        />
      ) : (
      <div className="flex flex-col gap-5 md:grid md:grid-cols-12">
        <div className="space-y-5 md:col-span-9">
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200/70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Aseguradora</th>
                  <th className="px-4 py-3 font-medium">Precio Anual</th>
                  <th className="px-4 py-3 font-medium">Cobertura</th>
                  <th className="px-4 py-3 font-medium">Comisión</th>
                  <th className="px-4 py-3 font-medium">Puntuación Nai</th>
                  <th className="px-4 py-3 font-medium">Recomendación</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((q, i) => (
                  <tr key={i} className={`border-b border-slate-50 ${i === 0 ? "bg-blue-50/40" : ""}`}>
                    <td className="flex items-center gap-2 px-4 py-3 font-medium text-slate-700">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">{q.key}</span>
                      {q.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{q.price}</td>
                    <td className="px-4 py-3 text-slate-600">{q.coverage}</td>
                    <td className="px-4 py-3 text-slate-600">{q.commission}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{q.score}%</td>
                    <td className="px-4 py-3">
                      {i === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-200">
                          <Star size={11} /> {q.rec}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{q.rec}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Card title="Visualización de Comparación" icon={BarChart3}>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Precio" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cobertura" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="space-y-4 md:col-span-3">
          <Card title="Nai Acción Recomendada" icon={Sparkles}>
            {quote?.recommendation ? (
              <>
                <p className="whitespace-pre-line text-xs text-slate-600">{quote.recommendation}</p>
                <button onClick={enviarPropuesta} className="mt-3 w-full rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                  Enviar esta propuesta al cliente
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-500">Nai todavía no ha dejado una recomendación escrita para esta cotización.</p>
            )}
          </Card>
          <Card title="Timeline de Cotización" icon={Clock}>
            {["Solicitud Recibida · Nai", "Cotizaciones Generadas · Nai", "Comparación Activa · Usuario", "Propuesta Seleccionada · Automatización", "Cierre"].map((t, i) => (
              <div key={i} className="flex items-center gap-2 py-1 text-xs text-slate-500">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-600">{i + 1}</span>
                {t}
              </div>
            ))}
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}

function ReportesPage() {
  const [insurerRows, setInsurerRows] = useState(INSURERS);
  const [totals, setTotals] = useState({ ventas: 0, comisionesAcum: 0, ingresosAcum: 0 });
  const [live, setLive] = useState(false);
  const [err, setErr] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const PALETTE = ["#2563eb", "#0ea5e9", "#6366f1", "#0d9488", "#7c3aed", "#f59e0b", "#ef4444", "#10b981", "#64748b"];

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    Promise.all([
      supabase.from("insurers").select("id, name, commission_default_pct").order("name"),
      supabase.from("policies").select("insurer_id, premium_total, status"),
      supabase.from("commissions").select("insurer_id, net_amount, status"),
    ]).then(([insRes, polRes, commRes]) => {
      if (insRes.error) { setErr(insRes.error.message); return; }
      const policies = polRes.data || [];
      const commissions = commRes.data || [];
      const mapped = (insRes.data || []).map((i, idx) => {
        const own = policies.filter((p) => p.insurer_id === i.id);
        const activas = own.filter((p) => p.status === "active");
        const ingreso = own.reduce((s, p) => s + Number(p.premium_total || 0), 0);
        const comisionInsurer = commissions.filter((c) => c.insurer_id === i.id).reduce((s, c) => s + Number(c.net_amount || 0), 0);
        return { name: i.name, polizas: activas.length, ingreso, comision: comisionInsurer, rendimiento: 0, color: PALETTE[idx % PALETTE.length] };
      });
      setInsurerRows(mapped);
      setTotals({
        ventas: policies.reduce((s, p) => s + Number(p.premium_total || 0), 0),
        comisionesAcum: commissions.reduce((s, c) => s + Number(c.net_amount || 0), 0),
        ingresosAcum: commissions.filter((c) => c.status === "collected").reduce((s, c) => s + Number(c.net_amount || 0), 0),
      });
      setLive(true);
    });
  }, [reloadTick]);

  return (
    <div>
      <PageHeader title="Centro Financiero de Inteligencia" subtitle={live ? "Datos en vivo desde Supabase (policies + commissions)." : err ? `No se pudo leer reportes: ${err}` : "Rendimiento consolidado de la operación y de tus aseguradoras."} right={<PrimaryButton icon={RefreshCw} onClick={() => setReloadTick((t) => t + 1)}>Actualizar</PrimaryButton>} />
      <div className="flex flex-col gap-5 md:grid md:grid-cols-12">
        <div className="space-y-5 md:col-span-8">
          <Card title="Rendimiento Financiero y Crecimiento" icon={TrendingUp}>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Ventas Totales" value={`$${totals.ventas.toLocaleString()}`} />
              <StatCard label="Comisiones Acumuladas" value={`$${totals.comisionesAcum.toLocaleString()}`} />
              <StatCard label="Ingresos Acumulados" value={`$${totals.ingresosAcum.toLocaleString()}`} />
              <StatCard label="Ganancia Neta" value={`$${totals.ingresosAcum.toLocaleString()}`} sub="Sin gastos operativos registrados todavía" />
            </div>
            {REVENUE_TREND.length === 0 ? (
              <EmptyState icon={TrendingUp} title="Sin historial financiero" subtitle="La tendencia de ingresos y gastos se graficará aquí a medida que existan operaciones registradas." />
            ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <AreaChart data={REVENUE_TREND}>
                  <defs>
                    <linearGradient id="ingresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Area type="monotone" dataKey="ingresos" stroke="#2563eb" fill="url(#ingresos)" strokeWidth={2} name="Ingresos Netos" />
                  <Line type="monotone" dataKey="gastos" stroke="#94a3b8" strokeWidth={2} dot={false} name="Gastos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            )}
          </Card>

          <Card title="Aseguradoras: Rendimiento y Comisiones" icon={Building2}>
            {insurerRows.length === 0 ? (
              <EmptyState icon={Building2} title="Sin aseguradoras con actividad" subtitle="Conecta o registra pólizas con tus aseguradoras para ver su rendimiento aquí." />
            ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="py-2 font-medium">Aseguradora</th>
                  <th className="py-2 font-medium">Pólizas</th>
                  <th className="py-2 font-medium">Ingreso</th>
                  <th className="py-2 font-medium">Comisión</th>
                  <th className="py-2 font-medium">Rendimiento</th>
                </tr>
              </thead>
              <tbody>
                {insurerRows.map((i, idx) => (
                  <tr key={idx} className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-700">{i.name}</td>
                    <td className="py-2.5 text-slate-500">{i.polizas}</td>
                    <td className="py-2.5 text-slate-500">${i.ingreso.toLocaleString()}</td>
                    <td className="py-2.5 text-slate-500">${i.comision.toLocaleString()}</td>
                    <td className={`py-2.5 text-xs font-semibold ${i.rendimiento >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      <span className="flex items-center gap-1">{i.rendimiento >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(i.rendimiento)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </Card>
        </div>

        <div className="space-y-5 md:col-span-4">
          <Card title="Inteligencia del Agente Nai" icon={Bot}>
            <p className="text-xs text-slate-500">Nai no ha detectado anomalías todavía — necesita datos de comisiones reales para analizar.</p>
          </Card>

          <Card title="Integraciones n8n &amp; WaAPI" icon={Zap}>
            <p className="text-xs text-slate-500">Consulta el estado real de tus integraciones en la sección Configuración.</p>
          </Card>

          <Card title="Timeline de Cobranza" icon={Clock}>
            {["Factura Generada · Nai", "Notificación WaAPI · Nai", "Pago Próximo · Amarillo", "Pago Vencido · Rojo", "Recuperación · Automatización"].map((t, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-600">{i + 1}</span>
                  {t}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// `onAdd` es opcional a propósito: si una tabla no tiene forma real de crear
// registros desde el panel (cobranzas y comisiones las genera n8n al emitir una
// póliza), no se pinta un botón que no haría nada.
function TablePage({ title, subtitle, columns, rows, badgeCol, onAdd, addLabel = "Añadir", note }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} right={onAdd ? <PrimaryButton icon={Plus} onClick={onAdd}>{addLabel}</PrimaryButton> : null} />
      {note && <p className="mb-3 text-xs text-slate-400">{note}</p>}
      {rows.length === 0 ? (
        <EmptyState title="Sin registros todavía" subtitle="Esta tabla se llenará con datos reales en cuanto existan en la base de datos." />
      ) : (
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
              {columns.map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                {Object.values(r).map((v, j) => (
                  <td key={j} className="px-4 py-3 text-slate-600">
                    {columns[j] === badgeCol ? <StatusBadge status={v} /> : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

// Mismo criterio que la compuerta de W2 (D016, workflows/w2_cerebro_nai.json,
// nodo "Aplicar compuerta") — un contacto solo cuenta como cliente si al
// menos un mensaje suyo mostró una señal real de negocio. Filtra el ruido de
// gente que le escribe al número personalmente sin preguntar por un seguro
// (ver ORCHEX-BRAIN/02_PROJECTS/Nairobi/CASOS_ARCHIVADOS.md para un caso real).
const ACCIONES_NEGOCIO = ["quote", "register_claim", "payment_information", "schedule", "emergency_protocol"];
const INTENTS_NEGOCIO = ["quote_request", "claim_report", "payment_inquiry", "policy_question", "appointment_request", "renewal", "cancellation"];
function esSenalDeNegocio(cls) {
  if (!cls) return false;
  return cls.scope === "business" || ACCIONES_NEGOCIO.includes(cls.recommended_action) || INTENTS_NEGOCIO.includes(cls.intent);
}

function ClientesPage() {
  const [rows, setRows] = useState([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    supabase
      .from("contacts")
      .select("id, name, phone, email, customer_status, updated_at, metadata, policies(id), conversations(messages(metadata))")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        setLoading(false);
        if (error) { setErr(error.message); return; }
        if (data && data.length > 0) {
          const clientesReales = data.filter((c) =>
            (c.policies?.length ?? 0) > 0 ||
            c.metadata?.source === "panel_manual" ||
            (c.conversations || []).some((cv) => (cv.messages || []).some((m) => esSenalDeNegocio(m.metadata?.classification)))
          );
          setRows(
            clientesReales.map((c) => ({
              nombre: c.name || "Sin nombre",
              telefono: c.phone || "—",
              correo: c.email || "—",
              polizas: c.policies?.length ?? 0,
              ultimo: c.updated_at ? new Date(c.updated_at).toLocaleString() : "—",
              estado: c.customer_status || "Activo",
            }))
          );
          setLive(true);
        }
      });
  }, [reloadTick]);

  return (
    <div>
      {showCreate && (
        <CreateModal
          title="Añadir Cliente"
          resource="contact-create"
          fields={[
            { name: "phone", label: "Teléfono (con código de país, sin +)", placeholder: "584121234567" },
            { name: "name", label: "Nombre", placeholder: "Nombre completo" },
            { name: "email", label: "Correo (opcional)", placeholder: "correo@ejemplo.com" },
          ]}
          onClose={() => setShowCreate(false)}
          onCreated={() => setReloadTick((t) => t + 1)}
        />
      )}
      <PageHeader
        title="Clientes"
        subtitle={
          live
            ? "Datos en vivo desde Supabase — solo contactos con señal real de negocio (cotización, siniestro, póliza, pago) o al menos una póliza."
            : isSupabaseConfigured
            ? loading ? "Cargando desde Supabase…" : err ? `No se pudo leer contacts: ${err}` : "Sin registros en Supabase todavía."
            : "Base de contactos sincronizada desde WhatsApp vía WaAPI (conecta Supabase en .env)."
        }
        right={<PrimaryButton icon={Plus} onClick={() => setShowCreate(true)}>Añadir</PrimaryButton>}
      />
      {rows.length === 0 ? (
        <EmptyState icon={Users} title="Sin clientes registrados" subtitle="Los contactos que pregunten por un seguro, cotización, siniestro o pago aparecerán aquí — el resto del tráfico personal al número se filtra." />
      ) : (
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
              {["Cliente", "Teléfono", "Correo", "Pólizas", "Último contacto", "Estado"].map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{r.nombre}</td>
                <td className="px-4 py-3 text-slate-600">{r.telefono}</td>
                <td className="px-4 py-3 text-slate-600">{r.correo}</td>
                <td className="px-4 py-3 text-slate-600">{r.polizas}</td>
                <td className="px-4 py-3 text-slate-600">{r.ultimo}</td>
                <td className="px-4 py-3"><StatusBadge status={r.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function PolizasPage() {
  const [rows, setRows] = useState(POLICIES);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("policies")
      .select("id, policy_number, status, premium_total, currency, end_date, contacts(name, phone), insurers(name), products(name)")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) { setErr(error.message); return; }
        if (data) {
          setRows(data.map((p) => ({
            id: p.policy_number || p.id.slice(0, 8),
            cliente: p.contacts?.name || p.contacts?.phone || "—",
            tipo: p.products?.name || "—",
            aseguradora: p.insurers?.name || "—",
            prima: `$${p.premium_total} ${p.currency}`,
            renovacion: p.end_date ? new Date(p.end_date).toLocaleDateString() : "—",
            estado: POLICY_STATUS_LABEL[p.status] || p.status,
          })));
          setLive(true);
        }
      });
  }, [reloadTick]);

  return (
    <>
      {showCreate && (
        <CreateModal
          title="Emitir Póliza"
          resource="policy"
          fields={[
            { name: "chat_id", label: "Teléfono del cliente (debe existir en Clientes)", placeholder: "584121234567" },
            { name: "insurer_id", label: "Aseguradora", loadOptions: { table: "insurers", valueCol: "id", labelCol: "name" } },
            { name: "product_id", label: "Producto", loadOptions: { table: "products", valueCol: "id", labelCol: "name", eq: ["is_active", true] } },
            { name: "policy_number", label: "Número de póliza (opcional)", placeholder: "Lo asigna la aseguradora" },
            { name: "premium_total", label: "Prima total", type: "number", placeholder: "0.00" },
            { name: "currency", label: "Moneda", type: "select", options: ["USD", "VES"], default: "USD" },
            { name: "payment_frequency", label: "Frecuencia de pago", type: "select", options: ["single", "monthly", "quarterly", "semiannual", "annual"], default: "annual" },
            { name: "start_date", label: "Inicio de vigencia", type: "date" },
            { name: "end_date", label: "Fin de vigencia", type: "date" },
          ]}
          onClose={() => setShowCreate(false)}
          onCreated={() => setReloadTick((t) => t + 1)}
        />
      )}
      <TablePage
        title="Pólizas"
        subtitle={live ? "Datos en vivo desde Supabase (tabla policies)." : err ? `No se pudo leer policies: ${err}` : "Cobertura activa gestionada a través de tus aseguradoras conectadas."}
        columns={["ID", "Cliente", "Tipo", "Aseguradora", "Prima", "Renovación", "Estado"]}
        badgeCol="Estado"
        rows={rows}
        onAdd={() => setShowCreate(true)}
        addLabel="Emitir Póliza"
        note="Al emitir una póliza, n8n genera automáticamente su calendario de cobros y las comisiones asociadas."
      />
    </>
  );
}

function CobranzasPage() {
  const [rows, setRows] = useState(COLLECTIONS);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("payments")
      .select("id, amount, currency, due_date, status, contacts(name, phone), policies(policy_number)")
      .order("due_date", { ascending: true })
      .limit(50)
      .then(({ data, error }) => {
        if (error) { setErr(error.message); return; }
        if (data) {
          setRows(data.map((p) => ({
            cliente: p.contacts?.name || p.contacts?.phone || "—",
            poliza: p.policies?.policy_number || "—",
            monto: `$${p.amount} ${p.currency}`,
            vence: p.due_date ? new Date(p.due_date).toLocaleDateString() : "—",
            estado: PAYMENT_STATUS_LABEL[p.status] || p.status,
          })));
          setLive(true);
        }
      });
  }, []);

  return (
    <TablePage
      title="Cobranzas"
      subtitle={live ? "Datos en vivo desde Supabase (tabla payments)." : err ? `No se pudo leer payments: ${err}` : "Pagos próximos y vencidos con recordatorios automáticos por WhatsApp."}
      columns={["Cliente", "Póliza", "Monto", "Vence", "Estado"]}
      badgeCol="Estado"
      rows={rows}
      note="Los cobros no se crean a mano: n8n los genera al emitir una póliza, según su frecuencia de pago."
    />
  );
}

function CitasPage() {
  const [rows, setRows] = useState(APPOINTMENTS);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("appointments")
      .select("id, title, purpose, starts_at, status, contacts(name, phone)")
      .order("starts_at", { ascending: true })
      .limit(30)
      .then(({ data, error }) => {
        if (error) { setErr(error.message); return; }
        if (data) {
          setRows(data.map((a) => ({
            id: a.id,
            hora: a.starts_at ? new Date(a.starts_at).toLocaleString() : "—",
            modo: APPT_STATUS_LABEL[a.status] || a.status,
            cliente: a.contacts?.name || a.contacts?.phone || "—",
            tipo: a.purpose || a.title || "Cita",
          })));
          setLive(true);
        }
      });
  }, [reloadTick]);

  return (
    <div>
      {showCreate && (
        <CreateModal
          title="Nueva Cita"
          resource="appointment"
          fields={[
            { name: "chat_id", label: "Teléfono del cliente (debe existir en Clientes)", placeholder: "584121234567" },
            { name: "title", label: "Título", placeholder: "Reunión de cotización" },
            { name: "purpose", label: "Motivo", placeholder: "Revisar opciones de RCV" },
            { name: "starts_at", label: "Inicio", type: "datetime-local" },
            { name: "ends_at", label: "Fin", type: "datetime-local" },
          ]}
          onClose={() => setShowCreate(false)}
          onCreated={() => setReloadTick((t) => t + 1)}
        />
      )}
      <PageHeader title="Citas" subtitle={live ? "Datos en vivo desde Supabase (tabla appointments)." : "Agenda sincronizada con Google Calendar vía n8n."} right={<PrimaryButton icon={Plus} onClick={() => setShowCreate(true)}>Nueva Cita</PrimaryButton>} />
      {err && <p className="mb-3 text-xs text-red-500">No se pudo leer appointments: {err}</p>}
      {rows.length === 0 ? (
        <EmptyState icon={Calendar} title="Sin citas agendadas" subtitle="Las citas sincronizadas desde Google Calendar aparecerán aquí." />
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{a.hora}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{a.modo}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{a.cliente}</p>
            <p className="text-xs text-slate-400">{a.tipo}</p>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}

function AseguradorasPage() {
  const [rows, setRows] = useState(INSURERS);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState("");
  const [aviso, setAviso] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const PALETTE = ["#2563eb", "#0ea5e9", "#6366f1", "#0d9488", "#7c3aed", "#f59e0b", "#ef4444", "#10b981", "#64748b"];

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    Promise.all([
      supabase.from("insurers").select("id, name, status, commission_default_pct").order("name"),
      supabase.from("policies").select("insurer_id, premium_total, status"),
    ]).then(([insRes, polRes]) => {
      if (insRes.error) { setErr(insRes.error.message); return; }
      const policies = polRes.data || [];
      const mapped = (insRes.data || []).map((i, idx) => {
        const own = policies.filter((p) => p.insurer_id === i.id);
        const activas = own.filter((p) => p.status === "active");
        const ingreso = own.reduce((s, p) => s + Number(p.premium_total || 0), 0);
        return {
          id: i.id,
          name: i.name,
          status: i.status,
          polizas: activas.length,
          ingreso,
          comision: Math.round(ingreso * (Number(i.commission_default_pct || 0) / 100)),
          color: PALETTE[idx % PALETTE.length],
        };
      });
      setRows(mapped);
      setLive(true);
    });
  }, [reloadTick]);

  // La afiliación se escribe vía n8n (recurso insurer-status de W8), nunca
  // directo a Supabase. El cotizador (W3) solo consulta las que quedan en
  // status='active', así que este toggle decide con quién cotiza Nai.
  async function toggleAfiliacion(ins) {
    const nuevo = ins.status === "active" ? "pending" : "active";
    setSaving(ins.id);
    setAviso("");
    try {
      const res = await callAppWebApi("insurer-status", { insurer_id: ins.id, status: nuevo });
      if (res.ok === false) throw new Error(res.error || "n8n rechazó el cambio");
      setAviso(`${ins.name}: ${nuevo === "active" ? "afiliación activada — Nai ya cotiza con ella" : "afiliación pausada — Nai deja de cotizar con ella"}.`);
      setReloadTick((t) => t + 1);
    } catch (e) {
      setAviso(`No se pudo actualizar ${ins.name}: ${e.message}`);
    } finally {
      setSaving("");
    }
  }

  const activas = rows.filter((r) => r.status === "active").length;

  return (
    <div>
      <PageHeader
        title="Aseguradoras"
        subtitle={live ? `${activas} de ${rows.length} con afiliación activa. Nai solo cotiza con las activas.` : err ? `No se pudo leer insurers: ${err}` : "Compañías conectadas y su rendimiento en la operación."}
      />
      {aviso && <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">{aviso}</p>}
      {rows.length === 0 ? (
        <EmptyState icon={Building2} title="Sin aseguradoras con actividad" subtitle="Las aseguradoras con pólizas o cotizaciones reales aparecerán aquí con su rendimiento." />
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {rows.map((i, idx) => (
          <Card key={i.id || idx}>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl text-white font-semibold" style={{ backgroundColor: i.color }}>{i.name[0]}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">{i.name}</p>
                <p className="text-xs text-slate-400">{i.polizas} pólizas activas</p>
              </div>
              {i.status && (
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${i.status === "active" ? "bg-emerald-50 text-emerald-600 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>
                  {i.status === "active" ? "Afiliada" : "Sin afiliar"}
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Ingreso</p><p className="font-semibold text-slate-700">${i.ingreso.toLocaleString()}</p></div>
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Comisión</p><p className="font-semibold text-slate-700">${i.comision.toLocaleString()}</p></div>
            </div>
            {i.id && (
              <button
                onClick={() => toggleAfiliacion(i)}
                disabled={saving === i.id}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {saving === i.id ? "Guardando…" : i.status === "active" ? "Pausar afiliación" : "Activar afiliación"}
              </button>
            )}
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}

function ComisionesPage() {
  const [rows, setRows] = useState(COMMISSIONS);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("commissions")
      .select("id, net_amount, status, insurers(name)")
      .then(({ data, error }) => {
        if (error) { setErr(error.message); return; }
        if (data) {
          const byInsurer = {};
          for (const c of data) {
            const name = c.insurers?.name || "—";
            if (!byInsurer[name]) byInsurer[name] = { aseguradora: name, acumulada: 0, pendiente: 0, count: 0 };
            byInsurer[name].count += 1;
            if (c.status === "collected") byInsurer[name].acumulada += Number(c.net_amount || 0);
            else byInsurer[name].pendiente += Number(c.net_amount || 0);
          }
          setRows(Object.values(byInsurer).map((r) => ({
            aseguradora: r.aseguradora,
            acumulada: `$${r.acumulada.toLocaleString()}`,
            pendiente: `$${r.pendiente.toLocaleString()}`,
            tasa: `${r.count} comisión(es)`,
          })));
          setLive(true);
        }
      });
  }, []);

  return (
    <TablePage
      title="Comisiones"
      subtitle={live ? "Datos en vivo desde Supabase (tabla commissions)." : err ? `No se pudo leer commissions: ${err}` : "Comisión acumulada y pendiente por aseguradora."}
      columns={["Aseguradora", "Acumulada", "Pendiente", "Tasa"]}
      rows={rows}
      note="Las comisiones las calcula n8n a partir de las pólizas emitidas y sus cuotas cobradas."
    />
  );
}

/* ------------------------------ CONFIGURACIÓN ------------------------------ */

// El backend real (n8n, W1/W2) usa Evolution API — esta lista es solo para
// el evento config-update opcional que este panel puede mandar a n8n; no
// cambia el proveedor real. Evolution API va primero y como default para
// no dar la impresión de que el sistema corre sobre WaAPI (abandonado).
const WHATSAPP_PROVIDERS = [
  { id: "evolution_api", label: "Evolution API (en uso ahora)" },
  { id: "meta_cloud_api", label: "Meta Cloud API (oficial)" },
  { id: "twilio", label: "Twilio WhatsApp" },
  { id: "gupshup", label: "Gupshup" },
  { id: "waapi", label: "WaAPI (abandonado, no usar)" },
];

function IntegrationRow({ label, description, placeholder, value, setValue, secret, testable, icon: Icon, readOnly, providerSelect, provider, setProvider }) {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [enabled, setEnabled] = useState(true);

  async function testConnection() {
    if (!value) { setStatus("error"); return; }
    setStatus("loading");
    try {
      const res = await fetch(value, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "Nairobi OS", test: true, timestamp: new Date().toISOString() }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch (e) {
      setStatus("error");
    }
  }

  async function testSupabaseConnection() {
    setStatus("loading");
    try {
      if (!isSupabaseConfigured) throw new Error("not configured");
      // Prueba real usando el SDK de Supabase ya conectado a la app
      // (no la URL escrita en el campo, que es solo referencia visual).
      const { error } = await supabase.auth.getSession();
      setStatus(error ? "error" : "success");
    } catch (e) {
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon size={15} /></div>
          <div>
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
        </div>
        <Toggle on={enabled} onClick={() => setEnabled(!enabled)} />
      </div>
      {enabled && (
        <div className="mt-3 space-y-2">
          {providerSelect && (
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
            >
              {WHATSAPP_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <input
              type={secret ? "password" : "text"}
              value={value}
              onChange={(e) => !readOnly && setValue(e.target.value)}
              placeholder={placeholder}
              readOnly={readOnly}
              className={`flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none ${readOnly ? "bg-slate-50 text-slate-400" : "text-slate-600"}`}
            />
            {testable && (
              <button
                onClick={label === "Conexión Supabase" ? testSupabaseConnection : testConnection}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {status === "loading" ? <Loader2 size={13} className="animate-spin" /> : status === "success" ? <Check size={13} className="text-emerald-500" /> : status === "error" ? <WifiOff size={13} className="text-red-500" /> : <Wifi size={13} />}
                Probar
              </button>
            )}
          </div>
        </div>
      )}
      {status === "success" && <p className="mt-1.5 text-[11px] text-emerald-600">Conexión establecida correctamente.</p>}
      {status === "error" && <p className="mt-1.5 text-[11px] text-red-500">No se pudo conectar. Verifica la URL o las credenciales.</p>}
    </div>
  );
}

// Lee el estado real de la automatización: public.settings (mode, test_allowlist,
// escritos por n8n) y public.system_errors de las últimas 24h. Nunca escribe —
// mismo principio de "n8n es el único escritor" que el resto del panel.
function SystemStatusCard() {
  const [mode, setMode] = useState(null);
  const [allowlistCount, setAllowlistCount] = useState(null);
  const [recentErrors, setRecentErrors] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("settings")
      .select("key, value")
      .in("key", ["mode", "test_allowlist"])
      .then(({ data, error }) => {
        if (error) {
          console.error("[Nairobi OS] settings:", error.message);
          setErr(error.message);
          return;
        }
        const modeRow = data?.find((r) => r.key === "mode");
        const allowRow = data?.find((r) => r.key === "test_allowlist");
        setMode(modeRow?.value ?? "test");
        setAllowlistCount(Array.isArray(allowRow?.value) ? allowRow.value.length : 0);
      });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("system_errors")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .then(({ count, error }) => {
        if (!error) setRecentErrors(count ?? 0);
      });
  }, []);

  if (!isSupabaseConfigured) return null;

  return (
    <Card title="Estado real de Nai (n8n)" icon={Bot}>
      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Modo</span>
          <StatusBadge status={mode === "production" ? "Activo" : mode === "test" ? "En Proceso" : "Próximo"} />
        </div>
        {mode === "test" && (
          <p className="text-[11px] text-slate-400">Solo responde a {allowlistCount ?? "—"} número(s) autorizados en pruebas — no a clientes reales todavía.</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Errores (24h)</span>
          <span className={`text-sm font-semibold ${recentErrors ? "text-red-500" : "text-emerald-600"}`}>{recentErrors ?? "…"}</span>
        </div>
        {/* Nairobi no tiene por qué leer el error crudo de PostgREST: se traduce.
            El texto técnico queda en la consola para quien tenga que depurarlo. */}
        {err && (
          <p className="text-[11px] text-red-500">
            No se pudo leer el estado. Recarga la página; si sigue igual, avísale a Orchex.
          </p>
        )}
      </div>
    </Card>
  );
}

// Números de familiares y conocidos que Nai debe ignorar por completo. W1 los
// consulta en el prefiltro, ANTES de llamar al modelo: un número aquí no gasta
// ni un token, y el texto de esos mensajes se guarda redactado.
// Lectura directa de Supabase (RLS permite SELECT a authenticated); la
// escritura pasa por W8, como todo lo demás.
function NumerosPrivadosCard() {
  const [numeros, setNumeros] = useState([]);
  const [nuevo, setNuevo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState("");
  const [err, setErr] = useState("");

  async function cargar() {
    if (!isSupabaseConfigured) return;
    setCargando(true);
    setErr("");
    try {
      const { data, error } = await supabase
        .from("settings").select("value").eq("key", "personal_blocklist").maybeSingle();
      if (error) throw error;
      setNumeros(Array.isArray(data?.value) ? data.value : []);
    } catch (e) {
      setErr(e.message || "No se pudo leer la lista.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function aplicar(action, phone) {
    setGuardando(phone || "nuevo");
    setErr("");
    try {
      const res = await callAppWebApi("blocklist", { action, phone });
      // W8 devuelve la lista completa ya normalizada: se pinta el estado real
      // que quedó guardado, no el que supone el panel.
      setNumeros(res?.data?.blocklist ?? []);
      if (action === "add") setNuevo("");
    } catch (e) {
      setErr(e.message || "No se pudo guardar.");
    } finally {
      setGuardando("");
    }
  }

  function formatear(n) {
    // 584124248369 → 0412 424 8369, que es como Nairobi los tiene en la agenda.
    const m = /^58(\d{3})(\d{3})(\d{4})$/.exec(n);
    return m ? `0${m[1]} ${m[2]} ${m[3]}` : n;
  }

  return (
    <Card title="Números privados (Nai los ignora)" icon={WifiOff}>
      <p className="mb-3 text-xs text-slate-500">
        Familiares y conocidos que escriben por temas personales. Nai no lee ni responde
        esos chats, y no gasta nada en procesarlos. Escribe el número como lo tienes en
        la agenda: <code className="rounded bg-slate-100 px-1 py-0.5">0412-4248369</code>.
      </p>

      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (nuevo.trim()) aplicar("add", nuevo.trim()); }}
      >
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="0412-4248369"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          disabled={!nuevo.trim() || guardando === "nuevo"}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {guardando === "nuevo" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Agregar
        </button>
      </form>

      {err && <p className="mt-2 text-[11px] text-red-500">{err}</p>}

      <div className="mt-3 space-y-1.5">
        {cargando && <p className="text-xs text-slate-400">Cargando…</p>}
        {!cargando && numeros.length === 0 && (
          <p className="text-xs text-slate-400">
            La lista está vacía: Nai evalúa todos los números que le escriben.
          </p>
        )}
        {numeros.map((n) => (
          <div key={n} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
            <span className="font-mono text-sm text-slate-700">{formatear(n)}</span>
            <button
              onClick={() => aplicar("remove", n)}
              disabled={guardando === n}
              title="Quitar de la lista"
              className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
            >
              {guardando === n ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ConfiguracionPage() {
  const [n8nUrl, setN8nUrl] = useState(import.meta.env.VITE_N8N_APP_WEB_URL || "");
  const [waapiProvider, setWaapiProvider] = useState("evolution_api");
  const [waapiKey, setWaapiKey] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | loading | success | error

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";

  // El panel nunca escribe directo a Supabase (arquitectura: n8n = único
  // escritor vía service_role). "Guardar" despacha un evento al webhook
  // de n8n configurado arriba; es n8n quien debe persistir el cambio.
  async function handleGuardar() {
    if (!n8nUrl) { setSaveStatus("error"); return; }
    setSaveStatus("loading");
    try {
      const res = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "nairobi_os_config_update",
          source: "Nairobi OS Panel",
          timestamp: new Date().toISOString(),
          payload: {
            whatsapp: { provider: waapiProvider, token: waapiKey ? "••• (enviado)" : null },
            google_calendar: { calendar_id: calendarId || null },
          },
        }),
      });
      setSaveStatus(res.ok ? "success" : "error");
    } catch (e) {
      setSaveStatus("error");
    }
  }

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Conecta Nairobi OS con n8n, WhatsApp, Supabase y APIs externas." />
      <div className="flex flex-col gap-5 md:grid md:grid-cols-12">
        <div className="space-y-5 md:col-span-8">
          <Card title="Automatización e Integraciones" icon={Zap}>
            <div className="space-y-3">
              <IntegrationRow
                icon={Link2} label="Webhook de n8n" description="Endpoint que recibe y despacha los flujos de trabajo de Nairobi OS. El botón Guardar Configuración envía los cambios de esta página a esta URL."
                placeholder="https://tu-instancia.n8n.cloud/webhook/nairobi-os"
                value={n8nUrl} setValue={setN8nUrl} testable
              />
              <IntegrationRow
                icon={MessageSquare} label="WhatsApp Business" description="Proveedor activo para envío y recepción de mensajes. El token se envía a n8n al guardar; nunca se lee ni se muestra desde Supabase."
                placeholder="Token del proveedor seleccionado"
                value={waapiKey} setValue={setWaapiKey} secret testable={false}
                providerSelect provider={waapiProvider} setProvider={setWaapiProvider}
              />
              <IntegrationRow
                icon={Building2} label="Conexión Supabase" description="Base de datos operativa (contacts, conversations, messages, etc.). URL y anon key reales, leídas de las variables de entorno del despliegue. Probar verifica la sesión real del SDK, no un texto libre."
                placeholder="https://tu-proyecto.supabase.co"
                value={supabaseUrl} setValue={() => {}} testable readOnly
              />
              <IntegrationRow
                icon={Calendar} label="Google Calendar" description="Sincroniza citas y renovaciones automáticamente. Pendiente: la autenticación (OAuth / cuenta de servicio) debe vivir en n8n, no en el panel."
                placeholder="ID de calendario o cuenta de servicio"
                value={calendarId} setValue={setCalendarId} testable={false}
              />
            </div>
          </Card>

          <NumerosPrivadosCard />

          <Card title="Flujos de Trabajo Personalizados" icon={Bot}>
            <p className="text-xs text-slate-500">Cada módulo de Nairobi OS despacha eventos al webhook de n8n configurado arriba, siguiendo el esquema <code className="rounded bg-slate-100 px-1 py-0.5">nairobi_os_core_schema_v1</code>. Los flujos sugeridos:</p>
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
              {[
                "Nuevo mensaje de WhatsApp → clasificación de Nai → creación de conversación",
                "Cotización solicitada → comparación multi-aseguradora → envío de propuesta",
                "Siniestro reportado → checklist de documentación → notificación al cliente",
                "Pago próximo a vencer → recordatorio automático → escalamiento si vence",
              ].map((f, i) => (
                <div key={i} className="rounded-lg border border-slate-100 p-2.5">{f}</div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5 md:col-span-4">
          <SystemStatusCard />
          <Card title="Config. de este panel (opcional)" icon={CircleDot}>
            <p className="mb-2 text-[11px] text-slate-400">
              No es el estado real del backend — eso está arriba, en "Estado real de Nai". Esto
              solo refleja si llenaste los campos de esta pantalla para el evento config-update.
            </p>
            <div className="space-y-2.5 text-sm">
              {[["Webhook de n8n (este formulario)", n8nUrl ? "Configurado" : "Pendiente"], ["Token de WhatsApp (este formulario)", waapiKey ? "Configurado" : "Pendiente"], ["Supabase (real, desde .env)", isSupabaseConfigured ? "Configurado" : "Pendiente"]].map(([l, s], i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-slate-600">{l}</span>
                  <StatusBadge status={s === "Configurado" ? "Activo" : "Próximo"} />
                </div>
              ))}
            </div>
          </Card>
          <Card title="Seguridad" icon={KeyRound}>
            <p className="text-xs text-slate-500">Acceso restringido a nivel de base de datos: RLS activo en todas las tablas, escritura exclusiva vía <code className="rounded bg-slate-100 px-1 py-0.5">service_role</code> desde n8n. Este panel nunca escribe directo a Supabase.</p>
          </Card>
          <button
            onClick={handleGuardar}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            disabled={saveStatus === "loading"}
          >
            {saveStatus === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Guardar Configuración
          </button>
          {saveStatus === "success" && <p className="text-center text-[11px] text-emerald-600">Enviado al webhook de n8n correctamente.</p>}
          {saveStatus === "error" && <p className="text-center text-[11px] text-red-500">No se pudo enviar. Verifica el webhook de n8n arriba.</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- APP ---------------------------------- */

export default function NairobiOS({ session, onSignOut }) {
  const [active, setActive] = useState("inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const titleMap = useMemo(() => Object.fromEntries(NAV.map((n) => [n.id, n.label])), []);

  const pages = {
    inicio: <InicioPage setActive={setActive} />,
    mensajes: <MensajesPage />,
    siniestros: <SiniestrosPage />,
    cotizaciones: <CotizacionesPage />,
    reportes: <ReportesPage />,
    clientes: <ClientesPage />,
    polizas: <PolizasPage />,
    cobranzas: <CobranzasPage />,
    citas: <CitasPage />,
    aseguradoras: <AseguradorasPage />,
    comisiones: <ComisionesPage />,
    configuracion: <ConfiguracionPage />,
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-800" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <Sidebar active={active} setActive={setActive} open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={titleMap[active]} onMenu={() => setSidebarOpen(true)} userEmail={session?.user?.email} onSignOut={onSignOut} onBell={() => setActive("mensajes")} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">{pages[active]}</main>
      </div>
    </div>
  );
}

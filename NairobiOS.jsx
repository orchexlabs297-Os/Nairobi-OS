import React, { useState, useMemo, useEffect } from "react";
import {
  Home, Users, FileText, ShieldCheck, AlertTriangle, DollarSign, Calendar,
  MessageSquare, Building2, Percent, BarChart3, Settings, Bell, Search,
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

const REVENUE_TREND = [
  { mes: "Mar", ingresos: 6200, gastos: 2100 },
  { mes: "Abr", ingresos: 7400, gastos: 2400 },
  { mes: "May", ingresos: 6900, gastos: 2200 },
  { mes: "Jun", ingresos: 9100, gastos: 2600 },
  { mes: "Jul", ingresos: 11800, gastos: 3100 },
  { mes: "Ago", ingresos: 15300, gastos: 3900 },
];

const INSURERS = [
  { name: "Seguros Andes", polizas: 37, ingreso: 15300, comision: 17500, rendimiento: 12, color: "#2563eb" },
  { name: "Aseguradora Continental", polizas: 30, ingreso: 14200, comision: 12300, rendimiento: 6, color: "#0ea5e9" },
  { name: "Aseguradora Horizonte", polizas: 29, ingreso: 13300, comision: 16200, rendimiento: -3, color: "#6366f1" },
  { name: "Aseguradora Del Valle", polizas: 23, ingreso: 11100, comision: 15100, rendimiento: 4, color: "#0d9488" },
  { name: "Aseguradora Pacífico", polizas: 24, ingreso: 10700, comision: 13100, rendimiento: -1, color: "#7c3aed" },
];

const QUOTE_INSURERS = [
  { key: "A", name: "Seguros Andes", price: "$412", coverage: "Full", commission: "18%", score: 92, rec: "Alta Probabilidad" },
  { key: "B", name: "Continental", price: "$465", coverage: "Full", commission: "14%", score: 75, rec: "73%" },
  { key: "C", name: "Horizonte", price: "$530", coverage: "Premium", commission: "20%", score: 88, rec: "75%" },
  { key: "D", name: "Del Valle", price: "$399", coverage: "Básica", commission: "12%", score: 87, rec: "70%" },
  { key: "E", name: "Pacífico", price: "$408", coverage: "Full", commission: "15%", score: 61, rec: "71%" },
  { key: "F", name: "Zenith", price: "$449", coverage: "Full", commission: "16%", score: 72, rec: "70%" },
  { key: "H", name: "Fénix", price: "$561", coverage: "Premium", commission: "19%", score: 89, rec: "70%" },
  { key: "I", name: "Meridian", price: "$405", coverage: "Full", commission: "17%", score: 93, rec: "70%" },
];

const CLIENTS = [
  { name: "Carlos Rodríguez", phone: "+44 585-9837-0300", email: "carlos.rod@mail.com", polizas: 3, estado: "Activo", ultimo: "Hoy, 11:00 AM" },
  { name: "Carlos Fringes", phone: "+44 585-2210-9931", email: "c.fringes@mail.com", polizas: 1, estado: "Prospecto", ultimo: "Ayer, 3:06 PM" },
  { name: "Marina López", phone: "+44 771-4420-1187", email: "marina.lopez@mail.com", polizas: 2, estado: "Activo", ultimo: "Hoy, 10:00 AM" },
  { name: "Carlos Nanta", phone: "+131-256-6773", email: "tanainfo@mail.com", polizas: 4, estado: "Activo", ultimo: "Hoy, 7:59 AM" },
  { name: "Carlos Sonorz", phone: "+44 902-1120-4471", email: "sonorz@mail.com", polizas: 1, estado: "Prospecto", ultimo: "Ayer, 6:12 PM" },
  { name: "Carlos Marca", phone: "+44 337-8820-0091", email: "marca@mail.com", polizas: 2, estado: "Escalado", ultimo: "Hoy, 7:00 AM" },
];

const POLICIES = [
  { id: "#POL-2201", cliente: "Carlos Rodríguez", tipo: "Colisión RCV", aseguradora: "Seguros Andes", prima: "$1,240/año", renovacion: "12 Sep 2026", estado: "Activa" },
  { id: "#POL-2202", cliente: "Marina López", tipo: "Cobertura Global", aseguradora: "Aseguradora Continental", prima: "$980/año", renovacion: "03 Sep 2026", estado: "Por Vencer" },
  { id: "#POL-2203", cliente: "Carlos Nanta", tipo: "Daño al Hogar", aseguradora: "Aseguradora Horizonte", prima: "$1,560/año", renovacion: "28 Oct 2026", estado: "Activa" },
  { id: "#POL-2204", cliente: "Carlos Fringes", tipo: "Colisión RCV", aseguradora: "Aseguradora Del Valle", prima: "$870/año", renovacion: "18 Ago 2026", estado: "Por Vencer" },
  { id: "#POL-2205", cliente: "Carlos Sonorz", tipo: "Cobertura Global", aseguradora: "Aseguradora Pacífico", prima: "$1,110/año", renovacion: "05 Dic 2026", estado: "Activa" },
];

const CLAIMS = [
  { cliente: "Carlos Rodríguez", poliza: "#9837-301", tipo: "Colisión RCV", aseguradora: "Seguros Andes", fecha: "29/11/2025", estado: "Nuevo", prioridad: "Alta" },
  { cliente: "Carlos Rodríguez", poliza: "#9837-302", tipo: "Daño al Hogar", aseguradora: "Aseguradora Continental", fecha: "29/11/2025", estado: "En Revisión", prioridad: "Alta" },
  { cliente: "Carlos Fringes", poliza: "#9837-304", tipo: "Daño al Hogar", aseguradora: "Seguros Andes", fecha: "29/11/2025", estado: "Documentación Pendiente", prioridad: "Alta" },
  { cliente: "Carlos Rodríguez", poliza: "#9837-395", tipo: "Colisión RCV", aseguradora: "Aseguradora Continental", fecha: "29/11/2025", estado: "Documentación Pendiente", prioridad: "Alta" },
  { cliente: "Carlos Fringes", poliza: "#9837-396", tipo: "Daño al Hogar", aseguradora: "Aseguradora Continental", fecha: "29/11/2025", estado: "En Proceso", prioridad: "Alta" },
  { cliente: "Carlos Rodríguez", poliza: "#9837-397", tipo: "Daño al Hogar", aseguradora: "Aseguradora Continental", fecha: "29/11/2025", estado: "En Proceso", prioridad: "Alta" },
  { cliente: "Carlos Rodríguez", poliza: "#9837-400", tipo: "Colisión RCV", aseguradora: "Seguros Andes", fecha: "29/11/2025", estado: "Resuelto", prioridad: "Alta" },
  { cliente: "Carlos Rodríguez", poliza: "#9837-401", tipo: "Colisión RCV", aseguradora: "Aseguradora Continental", fecha: "29/11/2025", estado: "Resuelto", prioridad: "Alta" },
  { cliente: "Carlos Fringes", poliza: "#9837-493", tipo: "Daño al Hogar", aseguradora: "Seguros Andes", fecha: "27/11/2025", estado: "Urgente", prioridad: "Alta" },
];

const CONVERSATIONS = [
  {
    id: 1, cliente: "Carlos Rodríguez", canal: "WhatsApp", estado: "Urgente", hora: "11:00 AM",
    resumen: "Solicitud de cotización RCV", prob: 90,
    thread: [
      { from: "client", text: "Hola, quisiera cotizar un seguro de auto para mi vehículo nuevo." },
      { from: "nai", text: "Nai identificó: solicitud de cotización RCV. Probabilidad comercial 90%." },
      { from: "agent", text: "Claro Carlos, en un momento te comparto las opciones disponibles." },
      { from: "nai", text: "Sugerencia: revisar cotización adjunta y responder sobre cobertura." },
    ],
  },
  {
    id: 2, cliente: "Carlos Fringes", canal: "WhatsApp", estado: "En Proceso", hora: "10:30 AM",
    resumen: "Renovación de póliza de hogar", prob: 68,
    thread: [
      { from: "client", text: "¿Ya está lista la renovación de mi póliza de hogar?" },
      { from: "nai", text: "Nai detectó intención de renovación. Póliza #POL-2204 vence en 4 días." },
    ],
  },
  {
    id: 3, cliente: "Marina López", canal: "WhatsApp", estado: "Nuevo", hora: "9:12 AM",
    resumen: "Consulta sobre cobertura de salud", prob: 54,
    thread: [
      { from: "client", text: "Buenos días, ¿qué cubre el plan de salud premium?" },
      { from: "nai", text: "Nai recomienda enviar folleto comparativo de planes de salud." },
    ],
  },
  {
    id: 4, cliente: "Carlos Nanta", canal: "WhatsApp", estado: "En Proceso", hora: "7:59 AM",
    resumen: "Seguimiento de siniestro #9837-397", prob: 40,
    thread: [
      { from: "client", text: "¿Alguna novedad con mi siniestro?" },
      { from: "nai", text: "Nai detectó siniestro en espera de resolución de aseguradora." },
    ],
  },
];

const APPOINTMENTS = [
  { hora: "10:00 AM", cliente: "Mariana López", tipo: "Renovación RCV", modo: "Llamada" },
  { hora: "12:30 PM", cliente: "Carlos Nanta", tipo: "Revisión de siniestro", modo: "Video" },
  { hora: "3:00 PM", cliente: "Carlos Fringes", tipo: "Firma de póliza", modo: "Presencial" },
  { hora: "5:15 PM", cliente: "Marina López", tipo: "Consulta de cobertura", modo: "Llamada" },
];

const COLLECTIONS = [
  { cliente: "Carlos Rodríguez", poliza: "#POL-2201", monto: "$103.00", vence: "18 Ago 2026", estado: "Próximo" },
  { cliente: "Marina López", poliza: "#POL-2202", monto: "$81.00", vence: "22 Ago 2026", estado: "Próximo" },
  { cliente: "Carlos Fringes", poliza: "#POL-2204", monto: "$72.50", vence: "10 Ago 2026", estado: "Vencido" },
  { cliente: "Carlos Nanta", poliza: "#POL-2203", monto: "$130.00", vence: "05 Ago 2026", estado: "Vencido" },
  { cliente: "Carlos Sonorz", poliza: "#POL-2205", monto: "$92.50", vence: "29 Ago 2026", estado: "Próximo" },
];

const COMMISSIONS = INSURERS.map((i) => ({
  aseguradora: i.name, acumulada: i.comision, pendiente: Math.round(i.comision * 0.18), tasa: `${10 + (i.polizas % 8)}%`,
}));

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
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
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
          <p className="mt-1 text-[11px] leading-snug text-slate-400">Supervisando 4 flujos activos vía n8n.</p>
        </div>
      </aside>
    </>
  );
}

function TopBar({ title, onMenu, userEmail, onSignOut }) {
  const initials = (userEmail || "Tiana Nairobi")
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
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200/70 sm:w-72 sm:flex-none">
          <Search size={14} className="shrink-0 text-slate-400" />
          <input placeholder={`Buscar en ${title.toLowerCase()}...`} className="w-full min-w-0 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button className="relative rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
          <Bell size={17} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-1 ring-1 ring-slate-200/70 sm:pr-2">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-[11px] font-semibold text-white">{initials}</div>
          <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-600 sm:inline">{userEmail || "Tiana Nairobi"}</span>
          <button onClick={onSignOut} title="Cerrar sesión" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------- PAGES ---------------------------------- */

function InicioPage({ setActive }) {
  const alerts = [
    { icon: Bot, tone: "text-blue-600 bg-blue-50", text: "Nai recomienda: 3 clientes requieren seguimiento hoy." },
    { icon: AlertTriangle, tone: "text-amber-600 bg-amber-50", text: "Nai detectó: 2 pólizas vencen en los próximos 7 días." },
    { icon: Flag, tone: "text-red-600 bg-red-50", text: "Siniestro urgente: Carlos Rodríguez (#1044). Requiere revisión." },
    { icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50", text: "Alta probabilidad: 4 cotizaciones (promedio 85%) listas para cierre." },
  ];
  return (
    <div>
      <PageHeader title="Buenos días, Nairobi." subtitle="Tienes el control total de tu operación." />
      <div className="flex flex-col gap-5 md:grid md:grid-cols-3">
        <div className="space-y-5 md:col-span-2">
          <Card title="Atención Prioritaria" icon={Sparkles} action={<NaiTag>Highlights inteligentes de Nai</NaiTag>}>
            <div className="space-y-2.5">
              {alerts.map((a, i) => {
                const Icon = a.icon;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${a.tone}`}>
                      <Icon size={15} />
                    </div>
                    <p className="pt-1 text-sm text-slate-600">{a.text}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Operación de Hoy" icon={CircleDot}>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-slate-400">Citas</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">10:00 AM — Mariana López</p>
                <p className="text-xs text-slate-400">Renovación RCV</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Siniestros Activos</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">7 Reportados</p>
                <p className="text-xs text-slate-400">1 Resuelto</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Cobranzas</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">12 Pagos Próximos</p>
                <p className="text-xs text-slate-400">3 Vencidos</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Cotizaciones</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">5 Nuevas</p>
                <p className="text-xs text-slate-400">2 Ganadas</p>
              </div>
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
              <StatCard label="Ganancias del Mes" value="$8,450.00" delta={12.5} />
              <StatCard label="Comisiones Acumuladas" value="$2,120.00" />
              <StatCard label="Pólizas Vendidas" value="28" delta={8} />
            </div>
          </Card>

          <Card title="Nai Trabaja. Tú Decides." icon={Bot}>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />Recientemente: Nai envió 14 recordatorios de pago automáticos (100%).</li>
              <li className="flex gap-2"><Clock size={15} className="mt-0.5 shrink-0 text-blue-500" />Nai está procesando 3 nuevas cotizaciones en tiempo real.</li>
              <li className="flex gap-2"><Link2 size={15} className="mt-0.5 shrink-0 text-indigo-500" />Integraciones: WaAPI Activo, n8n Motor Activo, Google Calendar Sincronizado.</li>
              <li className="flex gap-2"><Building2 size={15} className="mt-0.5 shrink-0 text-slate-400" />9 Aseguradoras conectadas y operando.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MensajesPage() {
  const [conversations, setConversations] = useState(CONVERSATIONS);
  const [selected, setSelected] = useState(CONVERSATIONS[0]);
  const [mode, setMode] = useState(true);
  const [live, setLive] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("conversations")
      .select("*, contacts(name, phone), messages(body, direction, created_at)")
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return;
        const mapped = data.map((c, i) => ({
          id: c.id ?? i,
          cliente: c.contacts?.name || "Cliente",
          canal: "WhatsApp",
          estado: c.status || "Nuevo",
          hora: c.updated_at ? new Date(c.updated_at).toLocaleTimeString() : "",
          resumen: c.last_summary || "Conversación de WhatsApp",
          prob: c.commercial_probability ?? 50,
          thread: (c.messages || []).map((m) => ({
            from: m.direction === "inbound" ? "client" : m.direction === "ai" ? "nai" : "agent",
            text: m.body,
          })),
        }));
        setConversations(mapped);
        setSelected(mapped[0]);
        setLive(true);
      });
  }, []);

  return (
    <div>
      <PageHeader title="Centro de Mensajes Inteligente" subtitle={live ? "Bandeja en vivo — sincronizada con Supabase." : "Bandeja de entrada unificada de WhatsApp, supervisada por Nai (datos de ejemplo)."} />
      <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:gap-5" style={isMobile ? undefined : { height: "calc(100vh - 190px)" }}>
        <div className="flex max-h-96 flex-col rounded-2xl bg-white ring-1 ring-slate-200/70 md:col-span-3 md:max-h-none">
          <div className="flex items-center justify-between border-b border-slate-100 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Atención Prioritaria</span>
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
                <div className="mt-1.5"><StatusBadge status={c.estado} /></div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-96 flex-col rounded-2xl bg-white ring-1 ring-slate-200/70 md:col-span-6 md:min-h-0">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{selected.cliente}</p>
              <p className="text-xs text-slate-400">{selected.resumen} · Probabilidad comercial: {selected.prob}%</p>
            </div>
            <MoreVertical size={16} className="text-slate-400" />
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {selected.thread.map((m, i) => (
              <div key={i} className={`flex ${m.from === "client" ? "justify-start" : "justify-end"}`}>
                {m.from === "nai" ? (
                  <div className="max-w-[75%] rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-sm text-indigo-700">
                    <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold"><Sparkles size={11} />Nai</div>
                    {m.text}
                  </div>
                ) : (
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.from === "client" ? "bg-slate-100 text-slate-700" : "bg-blue-600 text-white"}`}>
                    {m.text}
                  </div>
                )}
              </div>
            ))}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Nai Acción Recomendada</p>
              <p className="mt-1 text-sm text-slate-600">Sugerencia: enviar cotización pre-aprobada con la mejor comisión disponible.</p>
              <button className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Generar Respuesta Proactiva</button>
            </div>
          </div>
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Smile size={16} className="text-slate-400" />
              <Paperclip size={16} className="text-slate-400" />
              <input placeholder="Escribe un mensaje..." className="flex-1 bg-transparent text-sm focus:outline-none" />
              <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                <Toggle on={mode} onClick={() => setMode(!mode)} label={mode ? "Automatizado" : "Manual"} />
                <button className="rounded-lg bg-blue-600 p-1.5 text-white"><Send size={14} /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 md:col-span-3 md:overflow-y-auto">
          <Card title="Contexto del Cliente" icon={UserIcon}>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2"><Phone size={13} className="text-slate-400" />+44 585-9837-0300</p>
              <p className="flex items-center gap-2"><Mail size={13} className="text-slate-400" />{selected.cliente.split(" ")[0].toLowerCase()}@mail.com</p>
              <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">Resumen automático: {selected.cliente} busca {selected.resumen.toLowerCase()}. Tráfico frecuente de consultas.</p>
            </div>
          </Card>
          <Card title="Integraciones" icon={Zap}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><Wifi size={14} className="text-emerald-500" />WaAPI &amp; n8n</span>
              <Toggle on={true} onClick={() => {}} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Automatización activa — Nai Supervisando</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SiniestrosPage() {
  const [selected, setSelected] = useState(CLAIMS[0]);
  return (
    <div>
      <PageHeader
        title="Centro de Siniestros"
        subtitle="Listado de siniestros (claims list) supervisado por Nai."
        right={<PrimaryButton icon={Plus}>Crear Nuevo Siniestro</PrimaryButton>}
      />
      <div className="flex flex-col gap-5 md:grid md:grid-cols-12">
        <div className="overflow-hidden overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200/70 md:col-span-9">
          <div className="flex items-center gap-2 border-b border-slate-100 p-3">
            <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500"><Filter size={13} />Estado</button>
            <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500"><Building2 size={13} />Aseguradora</button>
            <input placeholder="Filtrar..." className="ml-auto w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none" />
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
              {CLAIMS.map((c, i) => (
                <tr
                  key={i}
                  onClick={() => setSelected(c)}
                  className={`cursor-pointer border-b border-slate-50 transition hover:bg-slate-50 ${selected === c ? "bg-blue-50/50" : ""}`}
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
          <Card title="Detalle del Siniestro" icon={FileCheck2}>
            <p className="text-sm font-semibold text-slate-800">{selected.cliente}</p>
            <p className="text-xs text-slate-400">{selected.poliza}</p>
            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
              <p className="flex items-center gap-2"><Phone size={13} className="text-slate-400" />+44 585-9837-0300</p>
              <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">Resumen automático: siniestro {selected.tipo.toLowerCase()} con {selected.aseguradora}.</p>
            </div>
            <div className="mt-4 space-y-3">
              {["Siniestro Reportado · Nai", "Documentación Pendiente · Usuario", "Envío a Aseguradora · Automatización", "En Espera de Resolución · Estado"].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-600">{i + 1}</span>
                  {t}
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-red-100" title="Siniestro Urgente" icon={AlertTriangle}>
            <p className="text-xs text-slate-500">Falta documentación crítica. {selected.cliente.split(" ")[0]} debe subir el informe policial.</p>
            <button className="mt-3 w-full rounded-lg bg-red-600 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Notificar Cliente</button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CotizacionesPage() {
  const chartData = QUOTE_INSURERS.map((q) => ({ name: q.name, Precio: parseInt(q.price.replace("$", "")), Cobertura: q.score }));
  return (
    <div>
      <PageHeader title="Comparador de Cotizaciones Multi-Aseguradora" subtitle="Cliente: Carlos Rodríguez · Tipo de seguro: RCV Solicitud" right={<PrimaryButton icon={FileText}>Generar Propuesta</PrimaryButton>} />
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
                {QUOTE_INSURERS.map((q, i) => (
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
          <Card title="Contexto del Cliente" icon={UserIcon}>
            <p className="flex items-center gap-2 text-sm text-slate-600"><Phone size={13} className="text-slate-400" />+44 585-9837-0300</p>
            <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">Carlos busca RCV, interés en salud. Tráfico frecuente de consultas.</p>
          </Card>
          <Card title="Nai Acción Recomendada" icon={Sparkles}>
            <p className="text-xs text-slate-500">Nai recomienda Seguros Andes para Carlos Rodríguez. Alta probabilidad de cierre (92%) con la mejor comisión.</p>
            <button className="mt-3 w-full rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Generar y Enviar Propuesta</button>
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
    </div>
  );
}

function ReportesPage() {
  return (
    <div>
      <PageHeader title="Centro Financiero de Inteligencia" subtitle="Rendimiento consolidado de la operación y de tus aseguradoras." right={<PrimaryButton icon={RefreshCw}>Actualizar</PrimaryButton>} />
      <div className="flex flex-col gap-5 md:grid md:grid-cols-12">
        <div className="space-y-5 md:col-span-8">
          <Card title="Rendimiento Financiero y Crecimiento" icon={TrendingUp}>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Ventas Totales" value="$15,300" delta={8.2} />
              <StatCard label="Comisiones Acumuladas" value="$4,200" />
              <StatCard label="Ingresos Acumulados" value="$3,200" delta={1.2} />
              <StatCard label="Ganancia Neta" value="$11,100" delta={1.1} />
            </div>
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
          </Card>

          <Card title="Aseguradoras: Rendimiento y Comisiones" icon={Building2}>
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
                {INSURERS.map((i, idx) => (
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
          </Card>
        </div>

        <div className="space-y-5 md:col-span-4">
          <Card title="Inteligencia del Agente Nai" icon={Bot}>
            <p className="text-xs text-slate-500">Nai detectó anomalías en las comisiones de Aseguradora Horizonte (probabilidad 85%). Sugerencia: solicitar revisión automatizada o manual.</p>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Revisión Automatizada</button>
              <button className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Revisión Manual</button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><Calendar size={12} />3 pagos próximos a vencer en los próximos 7 días.</p>
          </Card>

          <Card title="Integraciones n8n &amp; WaAPI" icon={Zap}>
            <div className="space-y-3">
              {[["Motor n8n", true], ["Integración WaAPI", true], ["Conexión a Aseguradoras", true]].map(([label, on], i) => (
                <div key={i} className="flex items-center justify-between text-sm text-slate-600">{label}<Toggle on={on} onClick={() => {}} /></div>
              ))}
            </div>
          </Card>

          <Card title="Timeline de Cobranza" icon={Clock}>
            {[["Factura Generada", "Nai"], ["Notificación WaAPI", "Nai"], ["Pago Próximo", "Amarillo"], ["Pago Vencido", "Rojo"], ["Recuperación", "Automatización"]].map(([t, tag], i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-600">{i + 1}</span>
                  {t}
                </span>
                <span className="text-[10px] text-slate-400">{tag}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function TablePage({ title, subtitle, columns, rows, badgeCol }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} right={<PrimaryButton icon={Plus}>Añadir</PrimaryButton>} />
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
    </div>
  );
}

function ClientesPage() {
  const [rows, setRows] = useState(CLIENTS.map((c) => ({ nombre: c.name, telefono: c.phone, correo: c.email, polizas: c.polizas, ultimo: c.ultimo, estado: c.estado })));
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        setLoading(false);
        if (error) { setErr(error.message); return; }
        if (data && data.length > 0) {
          setRows(
            data.map((c) => ({
              nombre: c.name || c.full_name || "Sin nombre",
              telefono: c.phone || c.whatsapp_number || "—",
              correo: c.email || "—",
              polizas: c.policy_count ?? "—",
              ultimo: c.last_contacted_at ? new Date(c.last_contacted_at).toLocaleString() : "—",
              estado: c.status || "Activo",
            }))
          );
          setLive(true);
        }
      });
  }, []);

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={
          live
            ? "Datos en vivo desde Supabase (tabla contacts)."
            : isSupabaseConfigured
            ? loading ? "Cargando desde Supabase…" : err ? `No se pudo leer contacts: ${err}` : "Sin registros en Supabase todavía — mostrando datos de ejemplo."
            : "Base de contactos sincronizada desde WhatsApp vía WaAPI (datos de ejemplo — conecta Supabase en .env)."
        }
        right={<PrimaryButton icon={Plus}>Añadir</PrimaryButton>}
      />
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
    </div>
  );
}

function PolizasPage() {
  return (
    <TablePage
      title="Pólizas"
      subtitle="Cobertura activa gestionada a través de tus aseguradoras conectadas."
      columns={["ID", "Cliente", "Tipo", "Aseguradora", "Prima", "Renovación", "Estado"]}
      badgeCol="Estado"
      rows={POLICIES.map((p) => ({ id: p.id, cliente: p.cliente, tipo: p.tipo, aseguradora: p.aseguradora, prima: p.prima, renovacion: p.renovacion, estado: p.estado }))}
    />
  );
}

function CobranzasPage() {
  return (
    <TablePage
      title="Cobranzas"
      subtitle="Pagos próximos y vencidos con recordatorios automáticos por WhatsApp."
      columns={["Cliente", "Póliza", "Monto", "Vence", "Estado"]}
      badgeCol="Estado"
      rows={COLLECTIONS}
    />
  );
}

function CitasPage() {
  return (
    <div>
      <PageHeader title="Citas" subtitle="Agenda sincronizada con Google Calendar vía n8n." right={<PrimaryButton icon={Plus}>Nueva Cita</PrimaryButton>} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {APPOINTMENTS.map((a, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{a.hora}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{a.modo}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{a.cliente}</p>
            <p className="text-xs text-slate-400">{a.tipo}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AseguradorasPage() {
  return (
    <div>
      <PageHeader title="Aseguradoras" subtitle="Compañías conectadas y su rendimiento en la operación." right={<PrimaryButton icon={Plus}>Conectar Aseguradora</PrimaryButton>} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {INSURERS.map((i, idx) => (
          <Card key={idx}>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl text-white font-semibold" style={{ backgroundColor: i.color }}>{i.name[0]}</div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{i.name}</p>
                <p className="text-xs text-slate-400">{i.polizas} pólizas activas</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Ingreso</p><p className="font-semibold text-slate-700">${i.ingreso.toLocaleString()}</p></div>
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-400">Comisión</p><p className="font-semibold text-slate-700">${i.comision.toLocaleString()}</p></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ComisionesPage() {
  return (
    <TablePage
      title="Comisiones"
      subtitle="Comisión acumulada y pendiente por aseguradora."
      columns={["Aseguradora", "Acumulada", "Pendiente", "Tasa"]}
      rows={COMMISSIONS.map((c) => ({ aseguradora: c.aseguradora, acumulada: `$${c.acumulada.toLocaleString()}`, pendiente: `$${c.pendiente.toLocaleString()}`, tasa: c.tasa }))}
    />
  );
}

/* ------------------------------ CONFIGURACIÓN ------------------------------ */

function IntegrationRow({ label, description, placeholder, value, setValue, secret, testable, icon: Icon }) {
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
        <div className="mt-3 flex items-center gap-2">
          <input
            type={secret ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
          />
          {testable && (
            <button
              onClick={testConnection}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {status === "loading" ? <Loader2 size={13} className="animate-spin" /> : status === "success" ? <Check size={13} className="text-emerald-500" /> : status === "error" ? <WifiOff size={13} className="text-red-500" /> : <Wifi size={13} />}
              Probar
            </button>
          )}
        </div>
      )}
      {status === "success" && <p className="mt-1.5 text-[11px] text-emerald-600">Conexión establecida correctamente.</p>}
      {status === "error" && <p className="mt-1.5 text-[11px] text-red-500">No se pudo conectar. Verifica la URL o las credenciales.</p>}
    </div>
  );
}

function ConfiguracionPage() {
  const [n8nUrl, setN8nUrl] = useState("");
  const [waapiKey, setWaapiKey] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || "");
  const [calendarId, setCalendarId] = useState("");

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Conecta Nairobi OS con n8n, WhatsApp (WaAPI), Supabase y APIs externas." />
      <div className="flex flex-col gap-5 md:grid md:grid-cols-12">
        <div className="space-y-5 md:col-span-8">
          <Card title="Automatización e Integraciones" icon={Zap}>
            <div className="space-y-3">
              <IntegrationRow
                icon={Link2} label="Webhook de n8n" description="Endpoint que recibe y despacha los flujos de trabajo de Nairobi OS."
                placeholder="https://tu-instancia.n8n.cloud/webhook/nairobi-os"
                value={n8nUrl} setValue={setN8nUrl} testable
              />
              <IntegrationRow
                icon={MessageSquare} label="WaAPI (WhatsApp Business)" description="Token para envío y recepción de mensajes automatizados."
                placeholder="waapi_live_••••••••••••"
                value={waapiKey} setValue={setWaapiKey} secret testable={false}
              />
              <IntegrationRow
                icon={Building2} label="Conexión Supabase" description="Base de datos operativa (contacts, conversations, messages). La URL y anon key reales se leen de tu .env — este campo es solo para pruebas de conectividad."
                placeholder="https://tu-proyecto.supabase.co"
                value={supabaseUrl} setValue={setSupabaseUrl} testable
              />
              <IntegrationRow
                icon={Calendar} label="Google Calendar" description="Sincroniza citas y renovaciones automáticamente."
                placeholder="ID de calendario o cuenta de servicio"
                value={calendarId} setValue={setCalendarId} testable={false}
              />
            </div>
          </Card>

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
          <Card title="Estado del Sistema" icon={CircleDot}>
            <div className="space-y-2.5 text-sm">
              {[["Motor n8n", n8nUrl ? "Configurado" : "Pendiente"], ["WaAPI", waapiKey ? "Configurado" : "Pendiente"], ["Supabase", supabaseUrl ? "Configurado" : "Pendiente"]].map(([l, s], i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-slate-600">{l}</span>
                  <StatusBadge status={s === "Configurado" ? "Activo" : "Próximo"} />
                </div>
              ))}
            </div>
          </Card>
          <Card title="Seguridad" icon={KeyRound}>
            <p className="text-xs text-slate-500">Acceso restringido a nivel de base de datos: RLS activo en todas las tablas, escritura exclusiva vía <code className="rounded bg-slate-100 px-1 py-0.5">service_role</code> desde n8n.</p>
          </Card>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            <Save size={15} /> Guardar Configuración
          </button>
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
        <TopBar title={titleMap[active]} onMenu={() => setSidebarOpen(true)} userEmail={session?.user?.email} onSignOut={onSignOut} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">{pages[active]}</main>
      </div>
    </div>
  );
}

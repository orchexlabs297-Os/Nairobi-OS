// Helpers compartidos por la suite. Ver tests/README.md para las reglas de
// seguridad (modo demo únicamente, nunca contra producción).

// Cada sección del panel (rail de navegación) junto con un texto único que
// solo aparece en el encabezado de esa sección — sirve para confirmar que la
// navegación realmente cambió de pantalla, no solo que el sidebar marcó el
// botón activo.
export const SECTIONS = [
  { id: "inicio", label: "Inicio", heading: "Buenos días, Nairobi" },
  { id: "clientes", label: "Clientes", heading: "Clientes" },
  { id: "cotizaciones", label: "Cotizaciones", heading: "Comparador de Cotizaciones Multi-Aseguradora" },
  { id: "polizas", label: "Pólizas", heading: "Pólizas" },
  { id: "siniestros", label: "Siniestros", heading: "Centro de Siniestros" },
  { id: "cobranzas", label: "Cobranzas", heading: "Cobranzas" },
  { id: "citas", label: "Citas", heading: "Citas" },
  { id: "mensajes", label: "Mensajes", heading: "Centro de Mensajes Inteligente" },
  { id: "aseguradoras", label: "Aseguradoras", heading: "Aseguradoras" },
  { id: "comisiones", label: "Comisiones", heading: "Comisiones" },
  { id: "reportes", label: "Reportes", heading: "Centro Financiero de Inteligencia" },
  { id: "configuracion", label: "Configuración", heading: "Configuración" },
  { id: "ayuda", label: "Ayuda", heading: "Ayuda" },
];

// Filtra el ruido esperado en modo demo (warning intencional de
// supabaseClient.js cuando no hay credenciales) de errores de consola reales.
const EXPECTED_DEMO_WARNINGS = [/Supabase no está configurado/i];

export function trackConsoleErrors(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (EXPECTED_DEMO_WARNINGS.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

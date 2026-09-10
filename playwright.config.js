import { defineConfig, devices } from "@playwright/test";

// Suite corre SIEMPRE en modo demo (VITE_ALLOW_DEMO=true, sin credenciales de
// Supabase/n8n reales) — este panel escribe a producción vía n8n (único
// escritor con service_role) y algunos botones disparan WhatsApp real a
// contactos reales. Ver tests/README.md antes de agregar un test que haga
// submit de un formulario o llame a un endpoint de n8n.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:5183",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // --host 127.0.0.1: en este entorno "localhost" resuelve a ::1 (IPv6) y Vite
    // solo bindea esa interfaz por defecto, dejando 127.0.0.1 sin escuchar.
    command: "npm run dev -- --port 5183 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:5183",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_ALLOW_DEMO: "true",
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
      VITE_N8N_APP_WEB_URL: "",
      VITE_N8N_APP_WEB_SECRET: "",
    },
    stdout: "pipe",
  },
});

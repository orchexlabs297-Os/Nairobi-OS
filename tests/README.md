# Tests — Nairobi OS (panel web)

Suite de Playwright para `platform/nairobi-os/`. Reglas duras, no opcionales:

## Regla #1: nunca contra producción

Este panel **nunca escribe directo a Supabase** — todo pasa por el webhook de n8n (`w8_api_app_web.json`),
que es el único escritor real (`service_role`). Y hay botones que disparan efectos **reales e
irreversibles**: "Elegir esta y enviar" en Cotizaciones llama a `enviarPropuesta()` → n8n →
Evolution API → **un WhatsApp real** al teléfono de un contacto real (el número conectado es el
personal de Sebastián, con contactos reales, no de prueba).

Por eso:

- `playwright.config.js` arranca el dev server con `VITE_ALLOW_DEMO=true` y **sin** credenciales de
  Supabase/n8n (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_N8N_APP_WEB_URL`,
  `VITE_N8N_APP_WEB_SECRET` explícitamente vacíos). En este modo `isSupabaseConfigured` es `false` y
  **todas** las páginas del panel saltan sus llamadas reales (`if (!isSupabaseConfigured) return;`,
  patrón usado en las ~13 páginas de `NairobiOS.jsx`) — el panel renderiza con estados vacíos, sin
  tocar ninguna base ni disparar ningún webhook.
- Ningún test de esta suite hace click en un botón de submit/envío real: "Cotizar", "Elegir esta y
  enviar", "Guardar Configuración", "Resolver", "Guardar" en modales de creación, etc. Los tests que
  tocan esos modales solo verifican que abren/cierran y que los campos existen — nunca completan el
  flujo. (En modo demo el botón "Cotizar" queda además deshabilitado porque `productos` nunca se
  carga sin Supabase — defensa en profundidad, no es la única razón por la que no se hace click.)
- Si algún test futuro necesita de verdad ejercitar la capa de n8n (por ejemplo, para probar un
  `resource` de W8), usar `page.route()` de Playwright para interceptar y mockear esa request —
  nunca dejarla salir a la URL real, y nunca poner un secreto real (`VITE_N8N_APP_WEB_SECRET`) en
  ningún archivo de este repo.

Si te encontrás queriendo probar algo que solo tiene sentido contra datos/producción reales, parate
y coordiná con el resto del equipo (varias sesiones de Claude trabajan sobre el mismo panel y el
mismo n8n) antes de apuntar cualquier cosa a producción.

## Correr la suite

```bash
npx playwright test              # headless
npx playwright test --ui         # modo interactivo
npx playwright show-report       # ver el reporte HTML del último run
```

El `webServer` de `playwright.config.js` levanta `npm run dev` solo (puerto 5183, separado del 5173
de uso interactivo) y lo apaga al terminar — no hace falta tener el dev server corriendo antes.

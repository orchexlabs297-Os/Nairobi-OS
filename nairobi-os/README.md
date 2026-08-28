# Nairobi OS — Centro Administrativo

Panel administrativo privado para tu agencia de seguros, con Nai (agente IA),
comparador de cotizaciones, siniestros, cobranzas y mensajería, listo para
conectarse a tu proyecto de Supabase (`bvuotcicefdjirgrxgfp`) y a tus flujos
de n8n / WaAPI.

---

## 1. Requisitos

- Node.js 18 o superior
- Tu proyecto de Supabase ya existe: `bvuotcicefdjirgrxgfp` (ca-central-1, Postgres 17)

---

## 2. Instalar dependencias

```bash
npm install
```

---

## 3. Conectar Supabase (datos + login privado)

1. Copia el archivo de entorno:
   ```bash
   cp .env.example .env
   ```
2. Ve a tu proyecto en el dashboard de Supabase → **Project Settings → API**.
3. Copia:
   - **Project URL** → pégalo en `VITE_SUPABASE_URL`
   - **anon public key** → pégalo en `VITE_SUPABASE_ANON_KEY`

   ⚠️ **Nunca uses el `service_role key` aquí.** Ese key es exclusivo de n8n
   (así está diseñada tu arquitectura: n8n es el único escritor con
   `service_role`, y el frontend solo debe usar el `anon key`, que es seguro
   de exponer porque RLS controla exactamente qué puede leer).

4. Aplica las políticas de lectura para el panel. Abre el **SQL editor** de tu
   proyecto y ejecuta el contenido de `supabase/policies.sql` (o aplícalo
   como migración con el MCP de Supabase / `apply_migration`, como ya vienes
   haciendo). Esto permite que usuarios **autenticados** del panel puedan
   leer `contacts`, `conversations` y `messages` — sin tocar el hecho de que
   n8n sigue siendo el único que escribe.

5. Crea los usuarios que podrán entrar al panel: en el dashboard de Supabase
   ve a **Authentication → Users → Add user** y crea uno por cada persona de
   tu equipo (correo + contraseña). No hay registro público — es intencional,
   así el panel queda privado.

---

## 4. Correr en local

```bash
npm run dev
```

Abre `http://localhost:5173`. Verás la pantalla de login; entra con un
usuario creado en el paso anterior.

> ¿Quieres previsualizar la interfaz sin conectar Supabase todavía? Pon
> `VITE_ALLOW_DEMO=true` en tu `.env` — el panel se abrirá directo con datos
> de ejemplo, sin login. Vuelve a ponerlo en `false` antes de desplegar.

---

## 5. Qué ya está conectado de verdad

- **Login** — Supabase Auth (`signInWithPassword`), sesión persistente.
- **Clientes** — lee en vivo la tabla `contacts` (si hay filas, reemplaza los
  datos de ejemplo automáticamente; si no, muestra demo sin romperse).
- **Mensajes** — intenta leer `conversations` + `messages` relacionadas; usa
  demo como respaldo.
- **Configuración → Automatización e Integraciones** — el botón "Probar" del
  webhook de n8n hace un `fetch` real (POST) contra la URL que pongas ahí.

El resto de las secciones (Siniestros, Cotizaciones, Pólizas, Cobranzas,
Citas, Aseguradoras, Comisiones, Reportes) siguen con datos de demostración
listos para que los conectes a medida que definas las tablas/vistas
correspondientes en Supabase o los webhooks de n8n — siguen el mismo patrón
que `ClientesPage` y `MensajesPage` en `src/components/NairobiOS.jsx`
(`supabase.from("tabla").select(...)` dentro de un `useEffect`).

---

## 6. n8n — flujo de datos

Arquitectura actual (según tu esquema `nairobi_os_core_schema_v1`):

```
WhatsApp (WaAPI) → n8n (service_role) → Supabase (contacts, conversations, messages)
                                              ↓
                              Panel Nairobi OS (anon key, solo lectura vía RLS)
```

En **Configuración**, pega la URL del webhook de n8n que recibirá los eventos
que dispara el panel (por ejemplo, "Generar y Enviar Propuesta" en
Cotizaciones, o "Notificar Cliente" en Siniestros). Cada acción está pensada
para despachar un evento con esta forma mínima:

```json
{
  "source": "Nairobi OS",
  "event": "quote.proposal_send",
  "payload": { "...": "..." },
  "timestamp": "2026-08-15T21:00:00.000Z"
}
```

Ajusta el nombre de `event` y el `payload` según el flujo de n8n que estés
construyendo.

---

## 7. Build para producción

```bash
npm run build
```

Esto genera la carpeta `dist/` lista para desplegar.

### Desplegar como app privada

Cualquiera de estas opciones funciona bien con Vite:

- **Vercel / Netlify**: conecta el repo, configura las variables de entorno
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en el panel del proveedor,
  y despliega. La privacidad la da el login de Supabase Auth, no el hosting.
- **Servidor propio**: sirve la carpeta `dist/` con Nginx/Caddy detrás de tu
  VPN o de autenticación básica adicional si quieres una capa extra.

La app **no** tiene registro público — solo entra quien tenga un usuario
creado manualmente en Supabase, así que es segura de desplegar incluso en
una URL pública.

---

## 8. Estructura del proyecto

```
nairobi-os/
├─ index.html
├─ package.json
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ .env.example
├─ supabase/
│  └─ policies.sql        ← políticas RLS de lectura para el panel
└─ src/
   ├─ main.jsx
   ├─ App.jsx             ← gate de sesión (login / panel)
   ├─ index.css
   ├─ lib/
   │  └─ supabaseClient.js
   └─ components/
      ├─ Login.jsx
      └─ NairobiOS.jsx    ← el panel completo (12 secciones)
```

# RISKS — Nairobi OS

> Riesgos abiertos y su mitigación. Se actualiza cuando aparece un riesgo nuevo o se cierra uno.

## Infraestructura (fuera de alcance del desarrollo de n8n — requieren autorización aparte)

### R001 — Puerto 5678 publicado en `0.0.0.0`
El `docker-compose.yml` de n8n publica `0.0.0.0:5678->5678`. Nginx hace proxy TLS por delante,
pero si UFW no bloquea el puerto, cualquiera que conozca la IP del VPS puede saltarse Nginx y
llegar a n8n directo. **No verificado si UFW lo bloquea** (requiere `sudo ufw status`, no
disponible en esta sesión sin autorización interactiva).
**Mitigación propuesta (no ejecutada):** restringir a `127.0.0.1:5678` en el compose, o confirmar
regla de UFW. **Requiere autorización explícita antes de tocar Docker/UFW.**

### R002 — n8n corre sobre SQLite en modo regular
Con volumen real de mensajes de WhatsApp, SQLite puede bloquear escrituras concurrentes. No hay
`EXECUTIONS_DATA_PRUNE` configurado — las ejecuciones se acumulan indefinidamente y pueden llenar
el disco.
**Mitigación propuesta:** migrar n8n a Postgres (separado del schema `nai` de negocio) y activar
poda de ejecuciones con retención ~14 días, antes de que el volumen crezca. **Requiere
autorización — toca la infraestructura de n8n, no solo los workflows.**

### R003 — Riesgo de baneo de WhatsApp por envíos masivos
WaAPI (como cualquier capa no oficial sobre WhatsApp) puede banear la instancia si se detecta
comportamiento de spam.
**Mitigación en diseño:** cobranzas (W6) envía en lotes de 5 con espera de 3s entre lotes, no
supera un techo diario conservador, y respeta ventana horaria 08:00–20:00.

## Producto / negocio

### R004 — Tarifas públicas insuficientes
Es esperable que la investigación pública (Fase 2) no cubra todos los productos de las 8
aseguradoras con tarifas calculables. **Esto es un resultado válido, no un fallo** — el
cotizador está diseñado para degradar a `manual_pending`/`unavailable` sin inventar precios.
**Mitigación:** Nairobi/Sebastián cargan tarifas reales después; la arquitectura ya lo soporta
sin cambios de diseño (ver D008 en `DECISIONS.md`).

### R005 — Confianza del clasificador sin datos reales todavía
El umbral `confidence < 0.55 → human_required` es una estimación inicial, no calibrada con
conversaciones reales. Puede escalar de más (molesto para Nairobi) o de menos (riesgo de que Nai
responda algo delicado sin suficiente certeza).
**Mitigación:** se persiste la clasificación completa en `nai.messages.classification` desde el
día 1 precisamente para poder recalibrar el umbral y el prompt con datos reales.

## Seguridad

### R006 — Webhook de WaAPI sin autenticación confirmada — RESUELTO (Evolution API)
Aún no se sabe si WaAPI permite enviar una cabecera custom en su webhook saliente hacia n8n. Si
no, la única protección es un path no adivinable (UUID largo), que es aceptable pero inferior a
un secreto verificado por cabecera.
**Estado:** moot — el proyecto migró a Evolution API self-hosted (2026-08-19/20), que sí soporta
headers custom en su config de webhook (`webhook/set`) porque el propio Orchex controla ambos
lados. Credencial `Evolution API webhook entrante` (httpHeaderAuth) ya creada y asignada al nodo
`Webhook Evolution API` de W1, con el header replicado en la config de la instancia `nairobi-os`.

### R010 — WhatsApp Address Mode (LID): el número real no siempre está en `remoteJid`
Confirmado el 2026-08-20 con un mensaje entrante real: WhatsApp ahora puede usar
`addressingMode: "lid"`, donde `key.remoteJid` es un identificador de privacidad (LID), no el
número de teléfono — el número real vive en `key.remoteJidAlt`. El nodo `Normalizar payload
Evolution API` de W1 ya prioriza `remoteJidAlt` sobre `remoteJid` para el campo `phone`, pero
**no se confirmó** si los grupos (`@g.us`) también pueden venir en modo LID — el guard de grupos
sigue evaluando sobre `remoteJid" crudo, asumiendo que no. Confirmar con un mensaje de grupo real
antes de activar W1 en producción.

### R011 — Evolution API no manda audio inline (a diferencia de WaAPI) — RESUELTO
La rama de transcripción de audio de W1 (`¿Es nota de voz?` → `Convertir a binario` →
`Transcribir audio`) asumía `media_base64` viniendo directo en el payload del webhook, como
hacía WaAPI. Evolution API/Baileys no lo hace — el audio hay que pedirlo aparte.
**Estado (2026-08-20):** resuelto. Nodo nuevo `Obtener audio (Evolution API)` (POST
`/chat/getBase64FromMediaMessage/nairobi-os`, credencial `Evolution API saliente`) + `media_base64
= respuesta` insertados entre `¿Es nota de voz?` y `Audio a binario`. Probado contra la API real
(no simulado) con un audioMessage real del historial de la instancia — la respuesta confirmada
trae `{ mediaType, fileName, size, mimetype, base64, buffer }`, `base64` es base64 plano listo
para `convertToFile`. `onError: continueErrorOutput` si Evolution API no puede recuperar el
audio (ej. media vencida del lado de WhatsApp) — no rompe el resto de W1.
**Pendiente real:** todavía falta la credencial `Anthropic`/`OpenAI` de transcripción en el nodo
`Transcribir audio` (ver `docs/CREDENCIALES.md` #6) y probar el flujo completo de punta a punta
con W1 activo — esta corrección resuelve la obtención del audio, no valida la transcripción en
vivo todavía.

### R007 — Guard `fromMe` es el punto de fallo crítico de W1
Sin este guard, el bot puede responder a sus propios mensajes salientes en bucle infinito,
consumiendo LLM sin límite y arriesgando el baneo de la instancia de WhatsApp.
**Mitigación:** W1 no se activa en ningún ambiente hasta que este guard tenga prueba funcional
verificada (payload con `fromMe: true` → cero mensajes salientes, cero fila nueva más allá del
registro de auditoría).

### R009 — Campos del payload WaAPI no confirmados: `fromMe`, `_serialized`, `t`
`N8N_AUDIT.md` verificó contra las plantillas existentes las rutas `_data.id.remote`,
`_data.type` y `_data.body`. Los campos que usa el guard crítico de W1 —
`_data.id.fromMe`, `_data.id._serialized` y `_data.t` — son **inferidos** por convención estándar
de whatsapp-web.js (que WaAPI envuelve), no verificados directamente contra un payload real.
**Mitigación:** W1 no se activa hasta correr los payloads de `tests/payloads/` (especialmente
02_from_me) contra un envío real de WaAPI y confirmar que esos campos existen con esos nombres
exactos. Si no existen, el guard `fromMe` debe rediseñarse antes de cualquier activación.

## Auditoría en curso

### R008 — Capacitación Destino: estudiantes no se registran correctamente
Es el único workflow **activo** de toda la instancia. Cualquier corrección mal aplicada puede
romper algo que hoy funciona parcialmente. **No se toca sin auditoría completa primero y
autorización explícita para aplicar la corrección.** Ver tarea de auditoría en curso.

## Riesgos identificados el 2026-08-21

### R012 — Renombrar un nodo en n8n rompe en silencio las expresiones `$('Nombre')` — OCURRIÓ, corregido
n8n resuelve `$('Nombre del nodo')` por nombre literal. Al renombrar `Normalizar payload WaAPI` →
`Normalizar payload Evolution API` (2026-08-20), las **8 expresiones** que lo referenciaban en W1
quedaron apuntando a un nodo inexistente — incluidas las de `Upsert contacto + conversación` e
`Insertar mensaje (dedup real)`, que están en el **camino común de las dos ramas** (texto y voz).
W1 habría fallado en todos los mensajes, no solo en los de audio.

No lo detectó nadie durante 1 día porque **W1 nunca se ha ejecutado** (inactivo desde siempre): un
error de referencia de este tipo no aparece al importar ni al guardar, solo en tiempo de ejecución.

**Estado:** corregido el 2026-08-21 en los 8 sitios. Auditados los 9 workflows, no queda ninguna
otra referencia rota.

**Mitigación permanente:** antes de dar por bueno cualquier rename de nodo, correr la verificación
de referencias (comparar todos los `$('...')` del JSON contra los nombres reales de nodos). Es
barato y detecta el problema sin necesidad de ejecutar el workflow. Vale para cualquier proyecto
n8n de Orchex — ver la lección en `06_KNOWLEDGE/LESSONS_LEARNED.md` del Brain.

### R013 — El nodo OpenAI de n8n hardcodea `whisper-1`: no sirve con proveedores alternativos
El nodo `@n8n/n8n-nodes-langchain.openAi` (resource=audio, operation=transcribe) fija
`const model = 'whisper-1'` en su código y **no expone ningún parámetro de modelo**. Cambiar la
Base URL de la credencial hacia otro proveedor compatible con OpenAI (Groq, etc.) **no alcanza**:
el modelo `whisper-1` no existe fuera de OpenAI y la llamada falla.

**Estado (2026-08-21):** resuelto reemplazando ese nodo por un `httpRequest` explícito con
`model=whisper-large-v3` (ver D013 y `CHANGELOG.md`). Probado contra la API real de Groq.

**Riesgo residual:** si una actualización futura de n8n agrega un selector de modelo a ese nodo,
alguien podría "simplificar" volviendo al nodo nativo. Antes de hacerlo, verificar que el modelo
sea configurable de verdad — no asumirlo por el número de versión.

### R014 — El camino de SALIDA seguía en WaAPI: Nairobi OS no podía enviar nada — CERRADO 2026-08-23
Descubierto el 2026-08-21. Los **6** nodos que envían WhatsApp del proyecto — `Enviar WaAPI` (W2),
`Notificar a Nairobi (WaAPI)` (W5), `Enviar WaAPI` (W6), `Enviar digest (WaAPI)` (W7),
`Enviar WaAPI (Nairobi)` (W8) y `Alertar a Sebastián (WaAPI)` (W9) — construyen su URL con
`$vars.WAAPI_ENDPOINT`/`$vars.WAAPI_INSTANCE_ID` (**variables que no existen en esta instancia**),
apuntan por defecto a `https://waapi.app/api/v1` (proveedor abandonado el 17-08 por el problema de
pago) y **no tienen ninguna credencial asignada**.

**Causa:** la migración a Evolution API (2026-08-20) cubrió solo la **entrada** — webhook de W1 y
obtención de audio. La salida quedó sin migrar y sin registrar como pendiente en ningún documento.
No se manifestó nunca porque ningún workflow se ha ejecutado.

**Consecuencia:** el sistema puede recibir y clasificar mensajes, pero **no puede responder ni
notificar nada**. Incluye la alerta de errores de W9 a Sebastián y el digest diario de W7.

**Corregido el 2026-08-23** (con autorización explícita de Sebastián). Los 6 nodos ahora hacen
`POST http://evolution-api:8080/message/sendText/nairobi-os` con body `{number, text}` y la
credencial `Evolution API saliente` (header `apikey`, id `SnHjtoJOJ0HG2mCe`). Detalles:

- Se confirmó **Evolution API 2.3.7** contra el contenedor antes de escribir nada — la v2 usa
  `{number, text}`; la v1 usaba `{number, options, textMessage:{text}}`. No se asumió por la doc.
- El `number` va en **dígitos pelados** (`.replace(/\D/g,'')`), sin `@c.us` ni `@s.whatsapp.net`.
- Los 6 nodos se **renombraron** (`... (WaAPI)` → `... (Evolution)`) y se actualizaron conexiones y
  referencias `$('...')` en el mismo paso, con el chequeo de integridad de `06_KNOWLEDGE` corriendo
  después — precisamente el bug del 20-08 que rompió W1 entero.
- **Bonus en W9:** usaba `$vars.SEBASTIAN_ALERT_CHAT_ID`, una variable que no existe en esta
  instancia (el alerta habría fallado siempre, en silencio). Se reemplazó por un nodo Postgres que
  lee `settings.emergency_contact_phone`, igual que W5 y W7.
- Script idempotente: `scripts/migrate_send_to_evolution.py`.

**Queda pendiente para que la salida sirva de verdad:** cargar
`settings.emergency_contact_phone` — hoy W5, W7 y W9 enviarían a un número vacío.

### R015 — No existía filtro antes de enviar: Nai respondería a los contactos personales de Sebastián — CERRADO 2026-08-23
Descubierto el 2026-08-21. La instancia de Evolution API está vinculada al **número personal de
Sebastián**. En W2, el nodo de envío recibe directamente de `Normalizar texto de salida`, **sin
ningún IF que consulte `is_test` ni una allowlist**. El campo `is_test` se propaga y se guarda en
`metadata`, pero no condiciona el envío. `settings.test_allowlist` existe pero **solo W6 la lee**.

**Consecuencia:** con W1+W2 activos, cualquier persona que le escriba a Sebastián por WhatsApp
(familia, amigos, cualquier contacto) recibiría respuestas automáticas de un bot de seguros.

**Mitigación temporal (accidental):** hoy es imposible porque el envío está roto (R014). No es un
control, es suerte — al arreglar R014 este riesgo se vuelve inmediato.

**Corregido el 2026-08-23** con una compuerta **por conversación**, no por mensaje (ver D014).
Cuatro nodos nuevos en W2 entre `Forzar umbral de confianza` y el ruteo de respuesta:
`Compuerta de respuesta` (SQL, solo lectura) → `Aplicar compuerta` (la regla) → `¿Responder?` (IF)
→ rama false a `Registrar silencio`.

Nai responde solo si `mode_ok` **y** la clasificación no es `ignore` **y** además una de:
conversación ya abierta por un mensaje de negocio previo, contacto con póliza registrada, o este
mensaje es `scope='business'`.

**Por qué no fue un simple IF sobre `test_allowlist` como decía este riesgo:** un filtro por
mensaje rompe la conversación. Después de "quiero cotizar", el cliente escribe "ok, ¿cuánto sale?"
—sin palabra clave— y Nai se quedaría muda a mitad de camino. La compuerta abre la *conversación*,
no aprueba cada mensaje.

**Nota operativa:** con `mode='test'` y `test_allowlist='[]'` (estado actual), la compuerta bloquea
a **todo el mundo, incluido Sebastián**. Es el default seguro correcto, pero hay que cargar su
número en la allowlist antes de la fase 7 o la prueba real dará silencio y parecerá un fallo.

### R016 — El clasificador podía morir en silencio si el LLM no cumplía el schema — CERRADO 2026-08-24
Descubierto durante la primera prueba real de W1+W2 (24-08). `A0 · Clasificador` (W2) usa un
`outputParserStructured` para forzar JSON con `scope/intent/confidence/...`, pero el modelo (Haiku)
**no siempre cumple el schema al 100%** — es un fallo probabilístico normal de LLMs contra un
schema estricto, no evitable del todo. Sin manejo de error, cuando eso pasaba el nodo tiraba
`"Model output doesn't fit required format"` y **detenía todo W2**. Como `onError` no estaba
configurado, el mensaje del cliente quedaba insertado en la base (por W1) pero nunca clasificado,
nunca respondido, y **sin ningún error visible** en `system_errors` (W9 tampoco estaba enganchado
como Error Workflow — ver pendiente en R014).

**Consecuencia:** un mensaje real de un cliente podía desaparecer para siempre, sin que nadie se
enterara, ni el cliente (silencio) ni Nairobi (sin alerta).

**Corregido el 2026-08-24.** `A0 · Clasificador` con `onError: continueErrorOutput`, conectado a
un nodo nuevo `Clasificación de respaldo (fallo de parseo)` que construye una clasificación segura
por defecto (`scope: 'unclear'`, `requires_human: true`, `recommended_action: 'human_required'`,
`escalation_reason: 'fallo_clasificador'`) y la mete al mismo camino que una clasificación real.
**Ante la duda, escala a un humano — nunca se pierde el mensaje.**

### R017 — El campo `scope` del clasificador a veces contradice su propio `recommended_action` — CERRADO
Descubierto el 24-08 en pruebas reales. Mensaje real: *"Buenas, necesito un seguro para mi carro"*.
El modelo clasificó correctamente `intent: 'quote_request'`, `product: 'rcv_auto'`,
`recommended_action: 'quote'`, `confidence: 0.95` — entendió perfecto que es una cotización de
seguro. Pero marcó `scope: 'personal'` en vez de `'business'`, contradiciendo su propio análisis.

**Consecuencia:** la compuerta de W2 (D014) solo miraba `scope === 'business'` para decidir si un
desconocido abre conversación. Con esta inconsistencia, un cliente real pidiendo cotización podía
quedar en silencio aunque el resto de la clasificación lo identificó bien.

**Decisión de Sebastián (25-08):** ampliar las señales de la compuerta — ver D016.

**Corregido el 2026-08-25**, en dos capas:

1. `Aplicar compuerta` ya no depende solo de `scope`. Abre si **cualquiera** de tres señales indica
   negocio: `scope === 'business'`, o `recommended_action` en
   `quote/register_claim/payment_information/schedule/emergency_protocol`, o `intent` en
   `quote_request/claim_report/payment_inquiry/policy_question/appointment_request/renewal/cancellation`.
2. **Bug real encontrado al probar la capa anterior en vivo:** el fix de arriba no tenía efecto
   porque `Forzar umbral de confianza` leía `$json` como si fuera la clasificación, pero el nodo
   inmediatamente anterior (`Guardar clasificación`) es un UPDATE de Postgres — su salida es el
   resultado de la escritura, no la clasificación. `scope`/`intent`/`recommended_action` llegaban
   `undefined`, y encima el bloque de confianza baja los sobreescribía con
   `escalation_reason: 'low_confidence'`, ocultando el problema real. Corregido leyendo la
   clasificación por referencia directa al nodo que la produjo
   (`$('A0 · Clasificador')` o `$('Clasificación de respaldo (fallo de parseo)')`, el que haya
   corrido en esa ejecución) en vez de `$json`.

**Efecto colateral encontrado y corregido en el mismo diagnóstico:** W5 (Escalación a Nairobi)
estaba inactivo — mismo patrón que el bug de W1→W2 del 24-08 (un workflow queda desactivado tras
`import:workflow` y nadie se entera hasta que algo lo dispara). Cualquier mensaje con
`requires_human: true` fallaba en el nodo `Escalar a Nairobi (W5)`. Activado y verificado.

**Verificado con mensaje real de prueba** ("Hola, quiero cotizar seguro de vida" desde el número
autorizado de prueba): la compuerta abrió, W2 generó una respuesta y **`Enviar WhatsApp (Evolution)`
completó sin error** — primer envío outbound confirmado en la historia del proyecto.

### Nota — falso gap descartado y hallazgo real (2026-08-25, tarde)

Al conectar el panel web con W8, se creyó haber encontrado un gap: la compuerta de W2 no
respetaba `conversations.should_respond` (el kill switch manual que el panel activa vía
`bot-toggle`). Se añadió una verificación de `should_respond` en `Compuerta de respuesta` /
`Aplicar compuerta` de W2 como capa extra.

**Al verificar con una prueba real se descubrió que el gap no existía**: W1 ya tiene un nodo
`Kill switch (¿bot pausado?)` que revisa `should_respond` y `metadata.paused_until` **antes** de
siquiera llamar a W2 — el mensaje ni se clasifica ni llega a la compuerta si el bot está pausado.
La verificación añadida en W2 es redundante (defensa en profundidad, no dañina) pero no era
necesaria. Se deja desplegada por si en el futuro algo invoca W2 sin pasar por W1.

**Hallazgo real de la sesión:** el endpoint `bot-toggle` de W8 (`Nairobi OS · 08 API App Web`)
**nunca había sido probado** — estaba inactivo (mismo patrón de "workflow desactivado tras import,
nadie se entera" que W2/W5 el 24-08 y 25-08). Al activarlo y probarlo, el webhook con segmento de
ruta dinámico (`nairobi-os-4d8e1f-api/:resource`) **no se registra en el router de n8n** pese a
que el workflow figura activo en la base y en los logs de arranque — el endpoint responde 404
("Cannot POST") en todas las pruebas. Ver R018.

### R018 — El endpoint `bot-toggle` de W8 no responde: bug de registro de rutas dinámicas en n8n — CERRADO
`Webhook App Web` usaba el path `nairobi-os-4d8e1f-api/:resource` para enrutar 9 recursos distintos
con un solo nodo Switch. n8n confirmaba el registro en su base interna (`webhook_entity` tenía la
fila exacta) y lo reportaba como activado en los logs, pero en tiempo de ejecución el router no lo
encontraba — 404 para cualquier recurso, incluso tras reimportar y reiniciar varias veces.

**Causa raíz confirmada (2026-08-25) en aislamiento**, con un workflow mínimo de prueba (fuera del
repo, borrado después): **n8n 2.33.3 no registra rutas de webhook con segmentos dinámicos
(`:param` o `*`) en producción**, punto. Probado en tres variantes — `:resource`, `*` (wildcard) —
ambas fallan igual. Una ruta **estática**, incluso con varios segmentos (`/algo/literal`), sí se
registra y responde bien una vez que pasa el delay normal de arranque del contenedor. No es un bug
de caché ni de reinicio — es que el router de producción de esta versión de n8n solo hace match
exacto de string contra `webhookPath`, no soporta patrones.

**Corregido:** se partió `Webhook App Web` en 9 nodos Webhook independientes, cada uno con una ruta
literal (`nairobi-os-4d8e1f-api/quote`, `.../bot-toggle`, etc.), todos alimentando la misma lógica
de negocio que antes colgaba del Switch (que se eliminó, junto con el nodo de respuesta 404 que ya
no aplica). Verificado con `curl` real contra los 9 recursos — todos responden 200.

**De paso, otro bug real encontrado y corregido en el mismo archivo:** `Insertar cita` leía
`chat_id`/`title`/`purpose`/`starts_at`/`ends_at` del nodo `POST appointment → verificar solape`,
que es un SELECT que solo devuelve `id` — esos campos nunca estuvieron ahí (mismo patrón de bug que
R017-bis: leer datos de un nodo que no los tiene). Corregido apuntando a la referencia del nodo
webhook real (`$('Webhook appointment').item.json.body...`).

**Se agregó un recurso nuevo, `claim-create`** (no existía — solo había `claim-update`, que asume
un siniestro ya creado). Pedido por Sebastián para el botón "Crear Nuevo Siniestro" del panel.
Verificado con `curl` real: crea la fila en `public.claims` correctamente.

### R019 — Recurso `appointment` de W8 responde 200 vacío sin insertar ni registrar error — CERRADO 2026-08-26
Descubierto el 26-08 al conectar el botón "Nueva Cita" del panel. `POST .../appointment` con un
body válido (chat_id existente, title, purpose, starts_at/ends_at ISO) responde `200` con cuerpo
completamente vacío — sin `{ok:true,...}`, sin error. La tabla `public.appointments` no recibe la
fila, y `public.system_errors` no registra nada (probado 3 veces, incluyendo con `curl -v`).

**No es el mismo bug que R018** (las rutas de W8 registran y responden bien — `bot-toggle`,
`contact-create` y `claim-create` funcionan de punta a punta, probados con curl real el mismo día).
Es específico de la cadena `Webhook appointment → POST appointment → verificar solape → ¿Hay
solape? → Insertar cita → Responder OK`.

**Hipótesis sin confirmar:** el nodo `¿Hay solape?` podría estar tomando la rama equivocada (la de
"sí hay solape", que solo responde OK sin insertar) incluso sin citas previas — mismo patrón de bug
de "un nodo Postgres devuelve un item aunque no debería" visto en R017-bis y en `Insertar cita`
(ya corregido hoy). No se investigó a fondo por prioridad: la demo de hoy depende del flujo de
WhatsApp (W1→W2), no de este botón. El botón "Nueva Cita" queda deshabilitado de facto hasta
resolver esto — no usarlo con clientes reales todavía.

**Causa real (26-08):** la hipótesis era casi correcta pero al revés. El nodo `verificar solape`
hacía `select id from appointments where ... solapa`; cuando **no** hay solape devuelve 0 filas, y
**un nodo Postgres con 0 filas emite 0 items**, no un item vacío. Con 0 items todo lo que sigue
deja de ejecutarse y el webhook responde 200 mudo. Además las ramas del IF estaban invertidas en la
práctica: el caso "sí hay solape" caía en `Responder OK`, es decir, un éxito falso.
**Corregido:** la query pasa a `select count(*)::int as solapes` (siempre una fila), el IF lee
`$json.solapes`, la rama de solape responde un error legible, y los `insert ... select ... from
contacts` llevan `alwaysOutputData` + un nodo `Responder creación` que traduce el item vacío a
"No existe un cliente con ese teléfono". Verificado con curl: creación real, teléfono inexistente y
horario solapado devuelven los tres respuestas distintas y correctas.

**Esta clase de bug es el patrón más caro del proyecto** — apareció ya cuatro veces (R017-bis,
R019, el cotizador de W3, y W7). Regla: *cualquier* nodo Postgres cuyo resultado pueda ser 0 filas
mata el resto del flujo en silencio. O se reescribe la query para que siempre devuelva una fila, o
lleva `alwaysOutputData` con un nodo que convierta el item vacío en un error explícito.

### R022 — La herramienta `agendar_cita` nunca guardó una cita: W7 inactivo + 3 bugs encadenados — CERRADO 2026-08-27
Al conectar el panel se descubrió que **W3, W4, W6 y W7 estaban inactivos** en la instancia de n8n,
pese a estar completos en el repo. Un sub-workflow inactivo hace que `executeWorkflow` falle con
`"Workflow is not active and cannot be executed."`, y el nodo padre **oculta ese mensaje** tras un
genérico `"Error executing workflow with item at index N"`. Es decir: las herramientas
`cotizar_seguro` y `agendar_cita` de Nai jamás funcionaron en producción, y el error nunca fue
legible. (Para verlo: `onError: "continueRegularOutput"` en el nodo `executeWorkflow` + un nodo que
exponga `$json.error`.)

Al activar W7 salieron tres fallos más, todos corregidos y verificados ejecutando el sub-workflow:

1. `Verificar solape` repetía exactamente el bug de R019 (0 filas = 0 items). Ahora usa `count(*)`.
2. **El nodo de Google Calendar sin `calendarId` invalida el workflow entero antes de ejecutarlo**
   (`WorkflowHasIssuesError`), tumbando también el `insert` de la cita. `onError` no sirve: la
   validación ocurre antes de correr el primer nodo. Queda **deshabilitado** hasta que se elija el
   calendario de Nairobi; la cita se confirma desde Postgres, no desde Calendar.
3. `Sugerir 3 huecos libres` referenciaba el alias de `generate_series` en su propio `WHERE`
   (`column "slot_start" does not exist`) — Postgres no lo permite; va envuelto en subconsulta.

W6 (Cobranzas) sigue **inactivo a propósito**: envía recordatorios programados a clientes reales y
no se activa sin decisión explícita de Sebastián/Nairobi.

### R020 — Fuga de identidad: Nai se presentaba como "Claude, hecho por Anthropic" en inglés — CERRADO
Descubierto el 26-08 en QA en paralelo (sesión asistente), reproducido con mensajes reales:
`"1"` y `"5"` sueltos en una conversación ya abierta (contexto de cotización previo) causaban
que Nai respondiera en inglés, algunas veces literalmente *"Hello! I'm Claude, an AI assistant
made by Anthropic."* — la peor fuga posible frente a un cliente real.

**Causa raíz:** el nodo `¿Personal / conversación simple?` de W2 decidía la rama de respuesta con
la condición `scope != 'business'` (OR con otras dos). Como `'unclear' != 'business'` también es
cierto, **cualquier mensaje con `scope: 'unclear'`** —incluyendo los que el propio clasificador
marcó `requires_human: true, recommended_action: 'human_required'`— caía en la rama de "charla
personal simple" (`Respuesta breve (Haiku)`) en vez de ir al puente de escalación a Nairobi
(`¿HUMAN_REQUIRED?` → `Mensaje puente al cliente`). El system prompt de esa rama está pensado para
saludos genéricos, no tiene instrucción explícita de "nunca reveles que eres un modelo de
lenguaje" — con un input tan corto y ambiguo como `"1"`, el modelo terminaba respondiendo con su
comportamiento genérico de asistente en vez de mantenerse en personaje.

**Corregido:**
1. `¿Personal / conversación simple?`: la condición cambió de `scope != 'business'` a
   `scope == 'personal'` — solo mensajes genuinamente personales toman esa rama; `unclear`/`spam`
   con `human_required` ahora sí llegan al puente de escalación, como debía ser desde el diseño
   original (D014).
2. Se agregó una instrucción explícita de "nunca reveles que eres un modelo de lenguaje, Claude,
   ni que fuiste hecho por Anthropic — eres Nai, punto" + "nunca respondas en inglés" a los tres
   nodos de IA que generan texto para el cliente (`Respuesta breve (Haiku)`, `Agente Nai (modo
   emergencia)`, `A1 · Agente Nai`) — defensa en profundidad, no depende solo del enrutamiento.

**Verificado con mensaje real:** el mismo `"1"` que antes producía la fuga ahora responde
correctamente vía el puente de escalación, en español, en personaje.

### R021 — Clasificador (A0) fallaba ~8% por formato y confundía RCV con trámite colombiano — CERRADO
Descubierto el 26-08 cuando el hermano de Sebastián probó "Hola quiero un RCV" y Nai escaló a
Nairobi en vez de cotizar. Se encontraron tres bugs encadenados, no uno solo:

1. **Fallo de formato del LLM:** `A0 · Clasificador` (claude-haiku-4-5) no devolvía el JSON exacto
   del Structured Output Parser en ~8% de los mensajes de los últimos 7 días (8 de 97), incluso
   después de sus 3 reintentos automáticos — el fallback de seguridad (R016) escalaba a humano por
   diseño, pero un 8% de falsa escalación en algo tan común como RCV era demasiado.
   **Corregido:** prompt de A0 endurecido (prohíbe explícitamente preámbulo/markdown antes del
   JSON) + se agregó un Auto-fixing Output Parser (nodo nativo de n8n/langchain) que repara JSON
   mal formado con una llamada extra barata antes de caer al fallback humano, sin cambiar de
   modelo ni subir costos.

2. **RCV confundido con "Revisión Técnico Mecánica":** mensajes como *"quiero sacar el rcv de mi
   carro"* clasificaban `scope: personal, intent: document_submission` — el razonamiento del
   modelo decía literalmente que interpretaba RCV como un trámite administrativo, no como el
   seguro (Responsabilidad Civil Vehicular) que vende Nairobi. El prompt de A0 nunca tuvo esa
   aclaración (sí la tenían A1 y el prompt de emergencia desde R020).
   **Corregido:** se agregó glosario explícito + un ejemplo concreto al prompt de A0. No fue
   suficiente por sí solo (el modelo siguió fallando esta clasificación puntual incluso después),
   así que se reforzó con una segunda capa determinística (ver punto 3).

3. **La red de seguridad de la compuerta (D016) no cubría este caso, y el enrutamiento posterior
   tampoco veía la corrección:** `document_submission` no estaba en `INTENTS_NEGOCIO`, así que ni
   siquiera la compuerta rescataba el `scope: personal` incorrecto — el mensaje se silenciaba por
   completo. Al agregarlo (y sumar `product` como cuarta señal de negocio, la más confiable: salió
   correcto las dos veces que scope/intent fallaron) el mensaje dejó de silenciarse, **pero salió
   algo peor**: el nodo `¿Personal / conversación simple?` decide la rama de respuesta mirando el
   `scope` crudo de A0, no la señal ya corregida por la compuerta — cayó en la rama Haiku "casual"
   (sin guardrails de producto/país) y respondió con markdown completo hablando de "Registro de
   Control y Vigilancia", SOAT, CESA y Secretaría de Movilidad — **trámites colombianos, no
   venezolanos**. Peor que el silencio original.
   **Corregido:** `Aplicar compuerta` ahora sobreescribe el campo `scope` a `'business'` en el
   objeto que pasa río abajo, cuando la señal de negocio vino de un campo distinto a `scope` —
   así el enrutamiento, el panel y cualquier otro consumidor ven la decisión ya corregida, no el
   dato crudo (y a veces equivocado) del modelo.

**Verificado con mensajes reales** (vía `tests/enviar_payload.sh --prod`, contra el número de
prueba de Sebastián — ver nota de alcance de datos): "Hola quiero un rcv" y "necesito rcv porfa"
clasifican y cotizan sin escalar; "hola buenas, quiero sacar el rcv de mi carro" ahora responde en
personaje, corto, sin markdown, mencionando el RCV como seguro — ya no la respuesta colombiana.

### R023 — Nai escalaba a Nairobi por falta de datos, y pagaba el clasificador por mensajes que ya sabía que iba a ignorar — CERRADO 2026-08-27

Dos hallazgos del mismo día, ambos con impacto directo en plata.

**1. Escalación innecesaria (la queja de Sebastián del 26-08, por otra vía).**
`"buenas, me pasa el precio del rcv de mi carro?"` clasificó bien —
`product=rcv_auto`, `intent=quote_request`, `confidence=0.85`— pero además marcó
`requires_human=true` con `escalation_reason: "se requiere información adicional del
vehículo"`. El nodo `¿HUMAN_REQUIRED?` lee ese campo como verdad absoluta, así que el
cliente recibió *"eso lo debe confirmar Nairobi, ya le avisé"* en vez de que Nai le pidiera
la placa y cotizara. **Que falten datos no es motivo para molestar a Nairobi: pedirlos es
justamente el trabajo del agente.**
**Corregido en dos capas** (mismo principio que R017: no confiar en un solo campo del modelo):
- Prompt de A0: regla dura de que la falta de datos nunca es `requires_human`, va
  `ask_information`.
- `Forzar umbral de confianza`: red determinista que anula `requires_human` cuando la acción
  recomendada es algo que Nai resuelve sola (`ask_information`/`quote`/`answer`), hay producto
  válido, no es emergencia y el cliente no pidió hablar con Nairobi. Deja rastro en
  `human_override_reason`.
Verificado en vivo: el mismo mensaje ahora responde *"¿cuál es el año de tu vehículo?"*.

**2. El 100% del gasto de clasificación se estaba yendo en mensajes que terminaban en silencio.**
Medición real de 7 días: **103 mensajes entrantes, 0 respondidos**. La compuerta (D014) decidía
bien a quién responder, pero decidía *después* de pagarle a Haiku por leer cada mensaje —
incluidos los de familiares y conocidos.
**Corregido:** prefiltro determinista en W1, antes de disparar W2 (`Señales del prefiltro` →
`¿Vale la pena clasificar?` → `¿Clasificar?`). Con **una sola query** resuelve los casos cuyo
destino ya se conoce sin leer el mensaje: `settings.personal_blocklist` (familiares y conocidos,
corte duro), modo test fuera de allowlist, conversación ya abierta y cliente con póliza. Para
desconocidos usa una lista léxica amplia de términos de seguros (incluye jerga venezolana y
errores de escritura frecuentes).

**El prefiltro NO cambia a quién le responde Nai** — replica la decisión que la compuerta ya
tomaba— solo deja de pagar por saberla. Ante la duda deja pasar al modelo: un falso positivo
cuesta centavos, un falso negativo es un cliente perdido. Si la lista léxica se queda corta el
síntoma es silencio ante un cliente real, así que al ampliarla hay que pecar de generoso.
Los silencios baratos quedan marcados con `metadata.gate.prefilter = true` para distinguirlos
de los que sí costaron una clasificación.

**Pendiente:** `personal_blocklist` está creada pero **vacía** — los números de familiares y
conocidos los tiene que cargar Sebastián/Nairobi. Mientras esté vacía, esos contactos siguen
pasando por el filtro léxico (que ya frena los saludos, pero no es lo mismo que la lista).

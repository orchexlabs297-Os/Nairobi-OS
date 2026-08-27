# Aseguradoras — cómo se conecta cada una

> **Actualización 2026-08-27:** la conclusión de abajo sigue en pie, pero resultó no ser el
> bloqueo que parecía. El **RCV tiene tarifa oficial regulada** (Gaceta 6.835), así que el producto
> más vendido se puede cotizar de verdad **sin API, sin credenciales y sin esperar ninguna firma**.
> Ver `COTIZAR_SIN_CREDENCIALES.md`.
>
> Investigado el 2026-08-23/24 contra los sitios reales. **Ninguna de las 9 publica una API.**
> El mercado asegurador venezolano no desarrolló esa capa (a diferencia de España, donde existen
> integradores tipo Codeoscopic). Lo que hay son extranets con login, pensadas para que una
> persona haga clic.

## Los documentos se dividen en dos mundos

| | Qué es | Se automatiza |
|---|---|---|
| **Públicos** | Condicionados, anexos, formularios. El **mismo PDF para toda la cartera** — el condicionado de RCV es idéntico para los 300 clientes que lo tengan. | ✅ Sí. `scripts/descubrir_condicionados.py` |
| **Privados** | Pólizas, recibos y siniestros de clientes concretos. Viven tras el login del extranet. | ⚠️ Solo con las credenciales profesionales de Nairobi. Último recurso. |

## Resultado del barrido público (2026-08-24)

| Aseguradora | Condicionados | Qué se encontró |
|---|---|---|
| **Seguros Caracas** | **41 PDFs** | El único que publica su catálogo completo y ordenado, en `/portal/Archivos/<Ramo>/`. Auto, hogar, salud, RCV, empresas, anexos. |
| **Seguros Altamira** | **11 PDFs** | En `/wp-content/uploads/2024/03/`. Condicionados generales y planillas de condiciones particulares. |
| Mapfre Venezuela | 0 | Solo convocatorias de asamblea de accionistas. No publica condicionados. |
| Mercantil | 0 | Sitemap desactualizado (404s reales en `/productos/*`). Sitio Next.js con documentos en CloudFront: solo términos legales y avisos de fraude. |
| La Internacional | 0 | SPA — el HTML servido no contiene enlaces, todo se renderiza en el navegador. Requeriría navegador headless. |
| Hispana | 0 | 3 PDFs no relevantes. Sus condicionados están tras el login de "Hispana Online". |
| Oceánica | 0 | 1 PDF no relevante. Sitemap en ruta no estándar (`/sitemap/sitemap-index.xml`). |
| Seguros Constitución | 0 | WordPress con `wp-json` cerrado. Su contenido vive en un portal Oracle ORDS privado. |
| **Atrio** | — | **Ver alerta abajo.** |

**Total cargado: 52 condicionados reales** de 2 aseguradoras.

## ⚠️ Alerta: el dominio de Atrio

`atrioseguros.com` y `www.atrioseguros.com` **redirigen (301) a `atriosegurosweb.com`**, que es
una plantilla de **GoDaddy Website Builder** cuyo sitemap lista **mochilas, medias, mantas,
posavasos y estanterías** — una tienda genérica sin relación con seguros.

No es un fallo de la herramienta: el dominio parece parqueado, vencido o comprometido. El portal
de intermediarios (`intermediarios.atrioseguros.com`, Oracle APEX) **sí responde** y es un
subdominio distinto.

**Si Nairobi tiene pólizas con Atrio, conviene que verifique por otra vía cuál es su sitio real.**

## Portales de intermediarios (todos con login, ninguno con API)

| Aseguradora | Portal | Tecnología |
|---|---|---|
| Mapfre | `extranet.mapfre.com.ve` | redirige a `/security/login` |
| Seguros Caracas | `extranet.seguroscaracas.com` | ASP.NET (ViewState) |
| La Internacional | `portales.la-internacional.com:8442` | — |
| Atrio | `intermediarios.atrioseguros.com/apex/f?p=114` | **Oracle APEX** |
| Constitución | `portal.segurosconstitucion.com:8443/ords/` | **Oracle ORDS** |
| Hispana | "Hispana Online" + app para tablets | — |

**Los dos Oracle (Atrio y Constitución) son los únicos con potencial técnico de API**: APEX/ORDS
corre sobre Oracle REST Data Services, que *puede* exponer endpoints REST. Pero solo si la
aseguradora los habilita — es una conversación comercial, no algo que se pueda forzar.

## Lo más cercano a una integración real: Altamira

Altamira publica un **`llms.txt`** — un archivo dirigido explícitamente a modelos de IA, señal de
que reciben agentes de buena gana. Y describe **emisión de RCV en línea autogestionada**:
cotización, pago digital y recepción de la póliza por correo, 24/7, en
`https://www.segurosaltamira.com/rcv/`.

Eso vale más que cualquier scraping: es un flujo pensado para ser usado sin intervención humana.
**Vale la pena evaluarlo antes que ninguna otra vía de integración.**

## Recomendación de orden

1. **Preguntarle a Nairobi qué le manda hoy cada aseguradora.** Muchas envían al corredor un
   archivo periódico de cartera/producción por correo. Eso es una integración estable y aburrida,
   y vale más que cualquier API que no existe.
2. **Evaluar el RCV digital de Altamira** como primer caso de emisión automatizada.
3. **Exportación manual desde los extranets** (casi todos los APEX/ASP.NET tienen "exportar a
   Excel") para la cartera existente.
4. **Scraping, último recurso y por aseguradora**, solo donde no haya otra vía. Riesgos reales:
   son credenciales profesionales de Nairobi, los términos de uso suelen prohibirlo, y un portal
   APEX rompe el scraper con cualquier cambio de pantalla.

## Herramientas construidas

- `scripts/descubrir_condicionados.py` — descubre y descarga PDFs públicos. Respeta `robots.txt`,
  1 request/segundo, User-Agent identificado. **No toca portales privados ni credenciales.**
- `scripts/cargar_condicionados.py` — sube lo descargado a Supabase Storage y lo registra en
  `public.documents` con `kind='condicionado'`. Idempotente por checksum; si la aseguradora
  publica una versión nueva, la vieja se marca `is_current=false` en vez de sobrescribirse.

## Estado de la carga (2026-08-24)

**Los 52 condicionados están cargados y verificados** en el proyecto `bvuotcicefdjirgrxgfp`:

| | |
|---|---|
| Filas en `public.documents` | 52 (`kind='condicionado'`, todas `is_current`) |
| Checksums únicos | 52 — sin duplicados |
| Seguros Caracas / Altamira | 41 / 11 |
| Binarios verificados | descarga real desde el bucket, `%PDF` válido y checksum coincidente |
| Bucket privado | confirmado: sin credencial devuelve 400 |

### Dos cosas que salieron mal y cómo quedaron

1. **Supabase Storage rechaza claves con tildes.** `Póliza de Salud en el Exterior.pdf` devolvía
   `400 InvalidKey`. Ahora la **ruta** se normaliza a ASCII (`clave_storage()`), pero
   `documents.file_name` conserva el nombre real con tildes — que es lo que ve Nairobi.

2. **Al corregir lo anterior se duplicaron 16 filas.** Cambiar cómo se calcula la ruta hizo que
   el chequeo de idempotencia (que busca por `storage_path`) no encontrara lo ya subido y lo
   tratara como nuevo. Se detectó al verificar contra la base —no por la salida del script, que
   decía "51 subidos" sin más— y se limpió borrando las 16 filas viejas y sus objetos huérfanos,
   tras confirmar por checksum que **todas tenían reemplazo**.

   **Lección:** la idempotencia por ruta se rompe si la ruta se recalcula distinto. El checksum es
   la identidad estable del archivo; la ruta no.

## Pendientes

- **Rotar la `service_role key`**: se compartió por chat el 2026-08-24 para esta carga.
- **8 de las 9 aseguradoras están en `status='pending'`** en `public.insurers`. Solo Altamira
  quedó `active` (se agregó el 24-08; no estaba sembrada pese a que Nairobi trabaja con ella).

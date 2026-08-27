# Cotizar de verdad sin entrar a las cuentas de las aseguradoras

> Investigado el 2026-08-27, tras la pregunta de Sebastián: *¿qué hacemos si Nairobi no firma la
> autorización de acceso?* Complementa `ASEGURADORAS_INTEGRACION.md` (23/24-08), que concluyó que
> **ninguna de las 9 aseguradoras publica una API**. Eso sigue siendo cierto — pero resulta que
> para el producto más vendido **no hace falta ninguna API ni ninguna credencial**.

## El hallazgo: el RCV no se cotiza, se calcula

El RCV **tiene tarifa oficial regulada**. No es un precio que cada aseguradora decide y hay que ir
a preguntarle: lo fija el Estado y es uniforme para todas.

- **Gaceta Oficial Extraordinaria N° 6.835 del 3 de septiembre de 2024** — normas sobre las
  condiciones generales y uniformes de las tarifas de la póliza de RCV (SUDEASEG).
- Las primas se expresan **en euros**, ancladas a la **Tasa de Cambio de Referencia (TCR)** más
  alta publicada por el BCV. Este sistema reemplazó en 2024 al basado en la Unidad Tributaria.
- Órdenes de magnitud publicados: **vehículos particulares 33–114 €/año**, **motos 15 €/año**,
  carga tipo A 44–108 € (+5 TCR por tonelada adicional), autobuses tipo A 114–258 €, placas
  extranjeras 120 €/año fijos. Base anual del particular: 39 TCR.

**Consecuencia directa para Nairobi OS:** el cotizador puede dar un precio real, correcto y
defendible de RCV **hoy**, sin credenciales, sin scraping y sin esperar ninguna firma. Es
precisamente el trámite que Sebastián señaló como "el más común y más simple del país".

## La pieza que faltaba: la tasa del BCV, automatizable

Probadas en vivo el 2026-08-27, ambas responden JSON sin autenticación:

| Fuente | Endpoint | Verificado |
|---|---|---|
| **bcv.today** | `https://bcv.today/api/v1/rate.json` | `{"USD":791.3248,"EUR":921.81425952,...,"effective_date":"2026-08-27"}` — trae **EUR**, que es lo que necesita el RCV. Se sirve estático desde GitHub Pages, sin límite de uso. Declara como fuente `bcv.org.ve`. |
| DolarAPI | `https://ve.dolarapi.com/v1/dolares/oficial` | `{"moneda":"USD","promedio":791.3248,...}` — solo USD. Útil como respaldo cruzado. |

Que las dos coincidan en USD (791.3248) es señal de que ambas leen bien al BCV. **Conviene usar
bcv.today como primaria** (tiene EUR) **y DolarAPI como verificación**: si difieren más de un
umbral, no cotizar y avisar, en vez de dar un precio dudoso.

> Nota de arquitectura: son fuentes de terceros que raspan al BCV. Para un número que va en una
> cotización que Nairobi le manda a un cliente, hay que guardar **junto a cada cotización** la tasa
> usada y su `effective_date`. Si mañana el cliente reclama, se puede reconstruir el cálculo.

## Plan por producto

| Producto | Cómo obtener precio real | Necesita firma |
|---|---|---|
| **RCV auto y moto** | Tabla de la Gaceta 6.835 × TCR del BCV. Cálculo determinista. | ❌ No |
| Salud (HCM), vida, hogar, funerario, viaje, AP | Tarifa comercial libre de cada aseguradora. No hay fuente pública. | Ver abajo |

Para todo lo que no es RCV hay tres caminos, en orden de solidez:

1. **Que Nairobi cargue las tarifas ella misma.** Las tablas `rate_tables` / `rate_rows` ya existen
   y están **vacías**. Toda aseguradora le entrega a su corredor tarifarios en PDF o Excel. Es
   trabajo manual una vez por vigencia, no requiere permiso de nadie, y es la fuente más fiable que
   existe: es el documento que la propia aseguradora le dio. **Esto es lo que hay que pedirle a
   Nairobi antes que cualquier otra cosa.**
2. **El archivo periódico que ya le llega.** Varias aseguradoras mandan al corredor un archivo de
   cartera/producción por correo. Ingerir un adjunto de correo es una integración estable y
   aburrida — y no toca ninguna credencial de portal. Hay que preguntarle qué recibe hoy.
3. **Extranet de intermediarios** — solo con la firma. Ver siguiente sección.

## Qué habilita exactamente la autorización firmada

El documento *"Autorización expresa de acceso — Agente Nai"* permite:

- Iniciar sesión en cuentas y portales de aseguradoras con credenciales que Nairobi provea.
- **Consultar** clientes, pólizas, cotizaciones, solicitudes, estados y documentos.
- Buscar, recopilar, procesar y organizar esa información para los flujos de Orchex.

Y **prohíbe expresamente**: cambiar contraseñas o configuraciones de seguridad, modificar pólizas
o cuentas, contratar/cancelar/modificar productos, pagar o transferir, firmar documentos o asumir
obligaciones, eliminar información, y compartir las credenciales con terceros.

**Traducción a decisiones técnicas, no negociables:**

| Cláusula del contrato | Cómo se cumple en Nairobi OS |
|---|---|
| Acceso **solo de lectura** | El worker no ejecuta jamás POST/PUT/DELETE contra el portal. Solo navegación y lectura. Cualquier formulario de emisión o pago queda fuera del alcance del código. |
| Credenciales confidenciales, "mecanismos de seguridad apropiados" | Van en credenciales de n8n (cifradas), nunca en el repo, nunca en el JSON de un workflow, nunca en logs. No se comparten entre sesiones ni se imprimen en depuración. |
| "Mantener registros de las acciones relevantes… para auditoría" | Tabla de bitácora: qué portal, qué consultó, cuándo, con qué resultado. Es requisito del contrato, no un extra. |
| "Cualquier acción con consecuencia legal o financiera requiere autorización humana adicional" | Todo lo que salga del modo lectura pasa por escalación a Nairobi. Ya existe ese camino (W5). |
| Supervisión humana, sin autonomía jurídica | Nai nunca se presenta como Nairobi ante la aseguradora ni firma nada. |

**Riesgos honestos del camino con firma** (hay que decírselos a Nairobi antes de que firme, no
después):

- Son **sus credenciales profesionales**. Un error del agente se ve, del lado de la aseguradora,
  como un error de ella.
- Los términos de uso de varios portales prohíben el acceso automatizado, **aunque el titular
  autorice**. La firma de Nairobi resuelve el permiso frente a Nairobi, no frente a la
  aseguradora. Antes de automatizar cada portal hay que leer sus condiciones, y donde lo prohíban,
  lo correcto es pedirle acceso formal a la aseguradora, no esconder el agente.
- Es **frágil**: un portal Oracle APEX o ASP.NET rompe el scraper con cualquier cambio de
  pantalla. Y si hay MFA, el flujo automatizado se detiene ahí — por diseño, y está bien que así
  sea.

## Recomendación

**No dependemos de la firma para lo que más importa.** El orden que propongo:

1. **Implementar el RCV tarifado** (Gaceta 6.835 + TCR del BCV). Cubre el producto de mayor
   volumen y elimina el `manual_pending` en el caso más común. Es la mayor ganancia por esfuerzo.
2. **Pedirle a Nairobi sus tarifarios** de los demás ramos, y cargarlos en `rate_tables`.
   Preguntarle también qué archivos le manda hoy cada aseguradora por correo.
3. **Evaluar el RCV digital de Altamira** (`segurosaltamira.com/rcv/`), que ya es un flujo
   autogestionado — señalado en `ASEGURADORAS_INTEGRACION.md`.
4. **Solo entonces**, y con la firma, el acceso a extranets: empezando por Atrio y Constitución,
   los dos Oracle ORDS/APEX, que son los únicos con posibilidad real de exponer REST si la
   aseguradora lo habilita. Eso es una conversación comercial que Nairobi puede tener con su
   ejecutivo de cuenta — y vale más que cualquier scraper.

## Estado de la implementación (2026-08-27)

**La maquinaria está construida y probada de punta a punta.** Falta una sola cosa, y es de negocio.

Qué se hizo:

- **Tarifa cargada**: 99 filas en `rate_rows` (9 aseguradoras × 11 categorías), primas en `EUR`,
  `valid_from = 2024-09-03`. Categorías: particular ≤800 kg (33) y >800 kg (39), casa móvil (39),
  auto-escuela (45), alquiler sin chofer (102), taxi (114), rústico (75), placa extranjera (120),
  moto (15), moto-carga (21).
- **Tasa del BCV en W3**: nodo `Tasa BCV (EUR/USD)` contra `bcv.today`. Si la fuente falla, la
  cotización se devuelve en euros marcada — **nunca se inventa una tasa**.
- **Match de tarifas corregido**: la consulta solo sabía filtrar por edad y cilindrada. Ahora hace
  match genérico (`criteria <@ inputs`), que es lo que permite tarifar por uso y peso.
- **Se dejaron de pedir datos que no cambian el precio**: `rcv_auto` pedía edad, marca, modelo, año
  y ciudad. En una tarifa regulada nada de eso influye. Ahora pide `uso` y `peso`; `rcv_moto` pide
  solo `uso`. La conversación con el cliente se acorta a una o dos preguntas.

Verificado con cotizaciones reales (tasa BCV del 27-08: 921,81 Bs/€):

| Caso | Prima oficial | Calculado |
|---|---|---|
| Moto particular | 15 € | Bs 13.827,21 |
| Auto particular >800 kg | 39 € | Bs 35.950,76 |
| Taxi | 114 € | Bs 105.086,83 |

Las tres pasaron de `manual_pending` a **`completed`**, con comisión calculada.

> Solo aparece **una** línea por cotización porque solo Altamira está en `status='active'`. Al
> activar las demás desde el panel, la misma cotización devolverá las 9 — y como la tarifa es
> regulada, todas al mismo precio: lo que diferencia a las aseguradoras aquí es servicio y
> comisión, no prima.

### ⚠️ La tabla quedó `is_active = false` a propósito

**No se activó**, así que hoy el cotizador sigue devolviendo `manual_pending`. El motivo: los
montos provienen de fuentes secundarias (prensa y un corredor), no del texto de la Gaceta, y ya
hay **una discrepancia detectada** — carga hasta 2 TM aparece como 44 € en una fuente y 45 € en
otra. Dar un precio equivocado a un cliente es un compromiso comercial de Nairobi, no un bug.

**Para activarla basta un UPDATE**, una vez que Nairobi confirme los montos:

```sql
update public.rate_tables set is_active = true where currency = 'EUR';
```

La forma más rápida de validar: preguntarle a Nairobi cuánto cobra hoy por un RCV de moto. Si
responde algo cercano a **Bs 13.827**, la tabla es correcta.

## Lo que falta para ejecutar el punto 1

**La tabla exacta de la Gaceta 6.835**, por categoría de vehículo. Los rangos publicados en prensa
(33–114 € particulares, 15 € motos) no bastan para calcular: hace falta el desglose por
kilogramos/uso/tipo. Nairobi debe tenerlo — es el documento con el que trabaja todos los días.
Con esa tabla, cargarla en `rate_tables`/`rate_rows` y conectar la tasa del BCV es trabajo
directo, sin bloqueos.

---

**Fuentes consultadas (2026-08-27):** [SUDEASEG — base normativa
RCV](https://www.sudeaseg.gob.ve/base-normativa/36-rcv-normas-sobre-las-condiciones-generales-y-uniformes-de-las-tarifas-que-conforman-la-poliza-de-rcv/) ·
[Nuevas normas y tarifas de la póliza RCV](https://boletines.latinolex.com/nuevas-normas-y-tarifas-de-la-poliza-rcv-en-venezuela-cambios-costos-y-recomendaciones) ·
[Efecto Cocuyo](https://efectococuyo.com/la-humanidad/nuevas-normas-y-tarifas-de-la-poliza-rcv-en-venezuela-cambios-costos-y-recomendaciones/) ·
[Extranet de intermediarios — Seguros
Caracas](https://www.seguroscaracas.com/extranet-intermediarios/inicioSSIntermediarios.aspx) ·
[BCV Today API](https://bcv.today/api/) · [DolarAPI Venezuela](https://ve.dolarapi.com/v1/dolares/oficial)

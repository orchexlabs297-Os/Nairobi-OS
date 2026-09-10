-- ============================================================================
-- Nairobi OS — migración 06: endurecer insurer_sync_snapshots (W10)
-- ============================================================================
-- EL HUECO QUE CIERRA ESTO (detectado 2026-09-05, revisión estructural de W10)
--
-- `public.insurer_sync_snapshots` (la tabla donde W10 vuelca lo que saca de
-- los portales de las aseguradoras) se creó ad hoc vía un workflow temporal de
-- n8n el 2026-08-31 y NUNCA quedó en ninguna migración — correr todas las
-- migraciones de este archivo en una base nueva no la recrearía. Además:
--
--   1. Es un log de solo inserción sin ninguna clave de deduplicación: cada
--      corrida de W10 (cada 8hs, cuando esté activo) vuelve a insertar las
--      mismas filas si nada cambió en el portal real. Con 203 filas
--      acumuladas ya solo en pruebas manuales de 2 de las 6 aseguradoras,
--      esto crece sin límite y sin aportar nada nuevo la mayoría de las veces.
--   2. NUNCA se le activó Row Level Security (confirmado: relrowsecurity =
--      false, 0 policies) — a diferencia de toda otra tabla del schema
--      (ver el bloque `enable row level security` de migration_02). Si esta
--      tabla es alcanzable vía PostgREST con la anon key del panel, hoy
--      cualquiera podría leer (o escribir) pólizas/clientes reales de las
--      aseguradoras sin ninguna restricción.
--
-- QUÉ CAMBIA
--   - Se agrega la tabla acá (create table if not exists), documentándola
--     por primera vez, sin tocar los datos ya cargados.
--   - Columna generada `row_hash` (md5 del row_data) + índice único
--     (insurer_code, page_key, row_hash): permite `ON CONFLICT ... DO
--     NOTHING` en el INSERT de W10b — una fila idéntica a la última no se
--     duplica, pero una fila distinta (ej. una póliza cambió de estado) SÍ
--     entra, quedando como historial real de cambios en vez de ruido.
--   - RLS habilitado, sin policies: mismo patrón que `system_errors`/
--     `settings` — nadie la lee/escribe vía la API pública (anon/
--     authenticated), solo n8n por conexión directa (bypassea RLS).
-- ============================================================================

create table if not exists public.insurer_sync_snapshots (
  id uuid primary key default gen_random_uuid(),
  insurer_code text not null,
  page_key text not null,
  row_data jsonb not null,
  synced_at timestamptz not null default now()
);

alter table public.insurer_sync_snapshots
  add column if not exists row_hash text generated always as (md5(row_data::text)) stored;

-- Limpieza única, antes del índice: las pruebas manuales repetidas contra
-- Atrio/Constitución (sin dedup todavía) ya dejaron filas 100% idénticas
-- cargadas más de una vez. Se borran los duplicados exactos, quedándose con
-- la fila más vieja de cada (insurer_code, page_key, row_hash) -- no se
-- pierde información real, solo copias sobrantes.
delete from public.insurer_sync_snapshots a
using public.insurer_sync_snapshots b
where a.insurer_code = b.insurer_code
  and a.page_key = b.page_key
  and a.row_hash = b.row_hash
  and (a.synced_at, a.id) > (b.synced_at, b.id);

create unique index if not exists ux_insurer_sync_dedup
  on public.insurer_sync_snapshots (insurer_code, page_key, row_hash);

create index if not exists ix_insurer_sync_lookup
  on public.insurer_sync_snapshots (insurer_code, page_key, synced_at desc);

alter table public.insurer_sync_snapshots enable row level security;
-- Sin policies a propósito: cierra el acceso vía PostgREST (anon/authenticated)
-- por defecto. n8n conecta directo por Postgres (Supabase Postgrest cred.,
-- rol con bypass de RLS), no vía la REST API, así que W10/W10b no se ven
-- afectados. Si el panel llega a necesitar leer esto algún día, agregar una
-- policy explícita de SELECT para `authenticated` recién ahí.

comment on table public.insurer_sync_snapshots is
  'Snapshots crudos de datos reales sacados de los portales de las aseguradoras '
  'por W10 (login_bridge.py). Dedup por row_hash: una fila solo se repite si '
  'row_data cambió de verdad respecto a la última guardada para ese '
  '(insurer_code, page_key). Documentada por primera vez en migration_06 '
  '(2026-09-05) — la tabla ya existía en producción desde 2026-08-31.';

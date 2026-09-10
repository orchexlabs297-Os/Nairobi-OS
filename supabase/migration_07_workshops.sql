-- ============================================================================
-- Nairobi OS — migración 07: talleres autorizados (siniestros de auto)
-- ============================================================================
-- ORIGEN DEL DATO (2026-09-07)
--
-- Sebastián entregó "TALLERES_ACTUALIZADOS_AL_02_2026" — el directorio real de
-- La Internacional de talleres autorizados a nivel nacional para reparaciones
-- de siniestros de auto (38 filas: región, taller, dirección, contacto,
-- teléfonos, correo). Es exactamente el tipo de dato que "vive solo en sus
-- archivos" que PROPOSITO_FUNDACIONAL.md pide centralizar — sin esta tabla,
-- W4 (siniestros) puede registrar un siniestro pero no puede decirle al
-- cliente a qué taller llevar el vehículo, que es parte real del proceso.
--
-- Por qué tabla nueva y no `documents`: un taller es un dato ESTRUCTURADO
-- (región, teléfono, email) que se necesita consultar programáticamente
-- ("¿qué talleres hay en Aragua?"), no un archivo que se lee entero. Guardar
-- el Excel como blob en `documents` habría sido más rápido pero inútil para
-- ese uso — mismo criterio que ya separa `rate_rows` de un PDF de tarifario.
-- ============================================================================

create table if not exists public.workshops (
  id            uuid primary key default gen_random_uuid(),

  insurer_id    uuid references public.insurers(id) on delete cascade,
  region        text not null,          -- estado/región donde opera (dato real de la aseguradora)
  business_name text not null,
  address       text,
  contact_name  text,
  phones        text,                   -- texto libre: llegan como "(0281) 123 - (0414) 456", no un solo numero
  email         text,
  notes         text,

  is_current    boolean not null default true,  -- para reemplazar la lista sin perder historial
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.workshops is
  'Talleres autorizados por aseguradora para reparaciones de siniestros de auto. '
  'Dato entregado directamente por el negocio (no hay API/scraping publico para esto). Migración 07.';

create index if not exists ix_workshops_insurer_region
  on public.workshops(insurer_id, region)
  where is_current;

alter table public.workshops enable row level security;

drop policy if exists "Panel: lectura autenticada de workshops" on public.workshops;
create policy "Panel: lectura autenticada de workshops"
  on public.workshops for select to authenticated using (true);

drop policy if exists "Panel: carga autenticada de workshops" on public.workshops;
create policy "Panel: carga autenticada de workshops"
  on public.workshops for insert to authenticated with check (true);

drop policy if exists "Panel: actualización autenticada de workshops" on public.workshops;
create policy "Panel: actualización autenticada de workshops"
  on public.workshops for update to authenticated using (true) with check (true);

-- Sin política de DELETE, mismo criterio que documents (migración 05): un
-- taller retirado se marca is_current=false, no se borra.

create or replace function public.tg_workshops_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_workshops_touch on public.workshops;
create trigger trg_workshops_touch
  before update on public.workshops
  for each row execute function public.tg_workshops_touch();

-- ============================================================================
-- Nairobi OS — migración 08: red de proveedores de salud (La Internacional)
-- ============================================================================
-- ORIGEN DEL DATO (2026-09-07, mismo día y misma entrega que migración 07)
--
-- Sebastián entregó "Red de Proveedores 12_02_2026" — la red real de La
-- Internacional para el producto Salud: 469 proveedores reales en 6
-- categorías (Clínicas 100%, Clínicas Comerciales, APS, Casa Comercial,
-- Otros, Urgencias), con estado/ciudad/dirección/teléfonos. Mismo criterio
-- que `workshops` (migración 07): dato que solo existe en los archivos de
-- Sebastián, no hay API/scraping público que lo reemplace, y conecta directo
-- con R041 (RISKS.md) — el mismo día que se activó la primera tarifa real de
-- Salud fuera de RCV, esto le da al sistema la red real para atender un
-- siniestro/consulta de ese producto, no solo cotizarlo.
--
-- El archivo original tiene 8 hojas (una por categoría + un "BUSCADOR" con
-- slicers + una hoja "DATOS" maestra). Se cargó únicamente la hoja "DATOS":
-- es la fuente real de las demás (confirmado contando por categoría: los
-- totales de "DATOS" agrupados por columna Categoria coinciden con las hojas
-- individuales), las otras son vistas/pivots armados para uso en Excel, no
-- datos adicionales.
-- ============================================================================

create table if not exists public.health_providers (
  id            uuid primary key default gen_random_uuid(),

  insurer_id    uuid references public.insurers(id) on delete cascade,
  category      text not null,          -- tal cual la columna "Categoria" del archivo real
  region        text not null,          -- "ESTADO" en el archivo
  city          text,                   -- "CIUDAD"
  business_name text not null,          -- "CLÍNICA"
  address       text,
  phones        text,

  is_current    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.health_providers is
  'Red de proveedores de salud (clínicas, APS, urgencias) por aseguradora. '
  'Dato entregado directamente por el negocio, mismo criterio que workshops (migración 07). '
  'Migración 08.';

create index if not exists ix_health_providers_insurer_region
  on public.health_providers(insurer_id, region)
  where is_current;

create index if not exists ix_health_providers_category
  on public.health_providers(category)
  where is_current;

alter table public.health_providers enable row level security;

drop policy if exists "Panel: lectura autenticada de health_providers" on public.health_providers;
create policy "Panel: lectura autenticada de health_providers"
  on public.health_providers for select to authenticated using (true);

drop policy if exists "Panel: carga autenticada de health_providers" on public.health_providers;
create policy "Panel: carga autenticada de health_providers"
  on public.health_providers for insert to authenticated with check (true);

drop policy if exists "Panel: actualización autenticada de health_providers" on public.health_providers;
create policy "Panel: actualización autenticada de health_providers"
  on public.health_providers for update to authenticated using (true) with check (true);

-- Sin política de DELETE, mismo criterio que documents/workshops: un
-- proveedor retirado se marca is_current=false, no se borra.

create or replace function public.tg_health_providers_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_health_providers_touch on public.health_providers;
create trigger trg_health_providers_touch
  before update on public.health_providers
  for each row execute function public.tg_health_providers_touch();

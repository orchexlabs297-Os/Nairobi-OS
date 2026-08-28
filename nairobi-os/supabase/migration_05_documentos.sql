-- ============================================================================
-- Nairobi OS — migración 05: almacenamiento real de documentos
-- ============================================================================
-- EL HUECO QUE CIERRA ESTO (detectado 2026-08-23)
--
-- El schema tenía columnas para *listar* documentos —`policies.documents`,
-- `claims.required_docs`, `claims.received_docs`, todas jsonb— pero **no había
-- ningún lugar donde guardar el archivo**. Ni bucket de Storage, ni tabla, ni
-- subida desde el frontend ni desde n8n. Se buscó en todo el proyecto: nada.
--
-- O sea: el sistema podía anotar "falta el carnet de circulación" pero no podía
-- recibirlo. Para una corredora eso es el trabajo, no un extra — el condicionado
-- de una póliza, la cédula del asegurado, las fotos de un choque.
--
-- QUÉ SE MANTIENE Y QUÉ CAMBIA
--
--   claims.required_docs   → SE QUEDA. Es una *lista de requisitos* ("cédula,
--                            fotos, presupuesto"), no archivos. Concepto distinto.
--   claims.received_docs   → queda por compatibilidad, pero la verdad pasa a
--   policies.documents       vivir en public.documents. No se borran para no
--                            romper nada que ya las lea.
--
-- MODELO DE ACCESO (el mismo que ya usa el proyecto)
--   n8n           = service_role → escribe
--   panel de Nai  = authenticated → lee, y ADEMÁS sube (Nairobi carga documentos
--                   a mano; si no puede, la plataforma no sirve para su trabajo)
--   anónimo       = nada
-- ============================================================================

-- ─── 1. Bucket privado ──────────────────────────────────────────────────────
-- Privado a propósito: acá van cédulas, pólizas y fotos de siniestros. El acceso
-- se da con URLs firmadas de duración corta, nunca con un bucket público.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  26214400,  -- 25 MB: un condicionado escaneado pesa, un video de siniestro no cabe (a propósito)
  array[
    'application/pdf',
    'image/jpeg','image/png','image/webp','image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/ogg','audio/mpeg'
  ]
)
on conflict (id) do nothing;

-- ─── 2. Tabla de documentos ─────────────────────────────────────────────────
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),

  -- dónde está el archivo de verdad
  bucket        text not null default 'documentos',
  storage_path  text not null,
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint,
  checksum_sha256 text,          -- permite detectar el mismo documento subido dos veces

  -- qué es
  kind          text not null default 'otro'
                check (kind in (
                  'condicionado',      -- condiciones generales/particulares de la aseguradora
                  'poliza',            -- la póliza emitida
                  'cotizacion',
                  'cedula',
                  'rif',
                  'licencia',
                  'carnet_circulacion',
                  'titulo_vehiculo',
                  'foto_siniestro',
                  'informe_medico',
                  'presupuesto',
                  'factura',
                  'recibo_pago',
                  'denuncia',          -- CICPC / tránsito
                  'otro'
                )),
  title         text,
  notes         text,

  -- a quién pertenece. Al menos una referencia obligatoria (ver constraint abajo).
  -- Un condicionado pertenece a la ASEGURADORA y al PRODUCTO, no a un cliente:
  -- es el mismo PDF para toda la cartera. Por eso las referencias son separadas
  -- y no un par (tabla, id) genérico — así la base sí puede garantizar integridad.
  contact_id    uuid references public.contacts(id) on delete cascade,
  policy_id     uuid references public.policies(id) on delete cascade,
  claim_id      uuid references public.claims(id)   on delete cascade,
  quote_id      uuid references public.quotes(id)   on delete cascade,
  insurer_id    uuid references public.insurers(id) on delete cascade,
  product_id    uuid references public.products(id) on delete cascade,

  -- de dónde salió
  source        text not null default 'panel'
                check (source in ('whatsapp','panel','aseguradora','importacion','n8n')),
  message_id    uuid references public.messages(id) on delete set null,
  uploaded_by   text,           -- email del usuario del panel, o 'n8n', o el teléfono del cliente

  is_current    boolean not null default true,   -- para versionar condicionados sin borrar el viejo
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint documents_storage_path_unico unique (bucket, storage_path),

  -- un documento suelto, sin dueño, es basura que nadie vuelve a encontrar
  constraint documents_debe_tener_dueno check (
    contact_id is not null or policy_id is not null or claim_id is not null
    or quote_id is not null or insurer_id is not null or product_id is not null
  )
);

comment on table public.documents is
  'Archivos reales del negocio (condicionados, pólizas, recaudos de siniestro). El binario vive en '
  'storage.objects/bucket "documentos"; acá van los metadatos y las relaciones. Migración 05.';
comment on column public.documents.is_current is
  'Las aseguradoras cambian los condicionados. Se marca el viejo is_current=false en vez de '
  'borrarlo: un siniestro se juzga con el condicionado vigente EN SU MOMENTO, no con el de hoy.';

create index if not exists ix_documents_contact on public.documents(contact_id) where contact_id is not null;
create index if not exists ix_documents_policy  on public.documents(policy_id)  where policy_id  is not null;
create index if not exists ix_documents_claim   on public.documents(claim_id)   where claim_id   is not null;
create index if not exists ix_documents_kind    on public.documents(kind, created_at desc);
-- Búsqueda del condicionado vigente de un producto: la consulta más frecuente al cotizar.
create index if not exists ix_documents_condicionado_vigente
  on public.documents(insurer_id, product_id)
  where kind = 'condicionado' and is_current;

-- ─── 3. RLS sobre la tabla ──────────────────────────────────────────────────
alter table public.documents enable row level security;

drop policy if exists "Panel: lectura autenticada de documents" on public.documents;
create policy "Panel: lectura autenticada de documents"
  on public.documents for select to authenticated using (true);

-- Nairobi sube documentos desde el panel. Sin esto, la plataforma no puede ser
-- parte de su trabajo — solo un tablero de lectura.
drop policy if exists "Panel: carga autenticada de documents" on public.documents;
create policy "Panel: carga autenticada de documents"
  on public.documents for insert to authenticated with check (true);

drop policy if exists "Panel: actualización autenticada de documents" on public.documents;
create policy "Panel: actualización autenticada de documents"
  on public.documents for update to authenticated using (true) with check (true);

-- Sin política de DELETE a propósito: un recaudo de siniestro borrado por error no
-- se recupera. Para retirar un documento se usa is_current=false.

-- ─── 4. RLS sobre los archivos del bucket ───────────────────────────────────
-- Las políticas de la tabla no protegen el binario: eso vive en storage.objects
-- y necesita sus propias reglas. Olvidarlo es el error clásico de Supabase Storage
-- (tabla cerrada, archivos abiertos a cualquiera con la URL).
drop policy if exists "Documentos: lectura autenticada" on storage.objects;
create policy "Documentos: lectura autenticada"
  on storage.objects for select to authenticated
  using (bucket_id = 'documentos');

drop policy if exists "Documentos: carga autenticada" on storage.objects;
create policy "Documentos: carga autenticada"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos');

drop policy if exists "Documentos: actualización autenticada" on storage.objects;
create policy "Documentos: actualización autenticada"
  on storage.objects for update to authenticated
  using (bucket_id = 'documentos');

-- ─── 5. updated_at ──────────────────────────────────────────────────────────
create or replace function public.tg_documents_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_documents_touch on public.documents;
create trigger trg_documents_touch
  before update on public.documents
  for each row execute function public.tg_documents_touch();

-- ─── 6. Vista de conveniencia: recaudos de un siniestro ─────────────────────
-- Responde "¿qué falta para este siniestro?" cruzando la lista de requisitos
-- (claims.required_docs) contra lo que de verdad está cargado.
create or replace view public.v_claim_documentos as
select
  c.id as claim_id,
  c.claim_number,
  c.status,
  c.required_docs,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
        'id', d.id, 'kind', d.kind, 'file_name', d.file_name,
        'storage_path', d.storage_path, 'created_at', d.created_at))
     from public.documents d
     where d.claim_id = c.id and d.is_current),
    '[]'::jsonb
  ) as documentos_cargados
from public.claims c;

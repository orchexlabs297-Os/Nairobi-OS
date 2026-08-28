-- ============================================================================
-- Nairobi OS — migración 02: tablas núcleo del negocio en el schema PÚBLICO
-- ============================================================================
-- Contexto (ver DECISIONS.md D011 en el repo de n8n): las tablas contacts,
-- conversations y messages YA EXISTEN en este proyecto (creadas por otra
-- sesión de Claude junto con la plataforma web) y NO se tocan aquí. Esta
-- migración solo AGREGA las tablas que faltan para que Cotizaciones, Pólizas,
-- Siniestros, Cobranzas, Citas, Aseguradoras y Comisiones dejen de mostrar
-- datos inventados y empiecen a leer datos reales que escribe n8n.
--
-- Mismo diseño ya validado en el schema `nai` (proyecto n8n/Vision), solo
-- re-emitido en `public` sin el prefijo de schema, para que quede en el
-- mismo lugar donde ya viven contacts/conversations/messages.
--
-- Ejecutar UNA VEZ en el SQL editor de Supabase (proyecto bvuotcicefdjirgrxgfp)
-- o vía migración/MCP, como ya se ha hecho con policies.sql.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ─── CATÁLOGO ────────────────────────────────────────────────────────────
-- Las 8 aseguradoras reales van en el seed (migration_03_seed.sql). Catálogo
-- DINÁMICO por diseño: ningún workflow de n8n itera un número fijo de
-- aseguradoras, todos consultan status = 'active'.
create table if not exists public.insurers (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  name          text not null,
  status        text not null default 'pending'
                check (status in ('active','inactive','pending')),
  logo_url      text,
  contact_email text,
  claims_phone  text,               -- número de asistencia 24/7, usado en protocolo de emergencia
  api_enabled   boolean not null default false,   -- capa de adaptación para futuras APIs de aseguradoras
  api_base_url  text,
  api_auth_type text check (api_auth_type in ('none','header','oauth2')),
  commission_default_pct numeric(5,2) not null default 10.00,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.insurers is
  'Aseguradoras afiliadas a Nairobi. status controla participación dinámica en el cotizador; nunca se borra una fila, solo pasa a inactive.';

create table if not exists public.products (
  id       uuid primary key default gen_random_uuid(),
  code     text unique not null,      -- rcv_moto, salud, embarazo, ...
  name     text not null,
  category text,
  rating_factors jsonb not null default '[]',  -- ej. ["edad","cc","suma_asegurada"]
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── TARIFAS (fuente manual | api | estimate) ─────────────────────────────
create table if not exists public.rate_tables (
  id           uuid primary key default gen_random_uuid(),
  insurer_id   uuid not null references public.insurers(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  source       text not null default 'manual' check (source in ('manual','api','estimate')),
  currency     char(3) not null default 'USD',
  valid_from   date not null default current_date,
  valid_to     date,
  is_active    boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists ux_rate_active on public.rate_tables(insurer_id, product_id, valid_from)
  where is_active;

-- Una fila = un tramo tarifario. criteria en JSONB para no atarnos a un producto específico.
create table if not exists public.rate_rows (
  id            uuid primary key default gen_random_uuid(),
  rate_table_id uuid not null references public.rate_tables(id) on delete cascade,
  criteria      jsonb not null,        -- {"age_min":18,"age_max":35,"cc_max":250}
  base_premium  numeric(12,2) not null,
  coverage_sum  numeric(14,2),
  deductible    numeric(12,2) default 0,
  coverage_items jsonb not null default '[]',
  commission_pct numeric(5,2),
  priority      int not null default 100,
  created_at    timestamptz not null default now()
);
create index if not exists ix_rate_rows_criteria on public.rate_rows using gin (criteria);
create index if not exists ix_rate_rows_table on public.rate_rows(rate_table_id);

-- Procedencia de la investigación de tarifas públicas. NUNCA se salta de
-- aquí directo a rate_rows sin que usable_for_calculation sea true — regla
-- dura del proyecto: nunca inventar tarifas.
create table if not exists public.rate_research (
  id            uuid primary key default gen_random_uuid(),
  insurer_id    uuid not null references public.insurers(id) on delete cascade,
  product_id    uuid references public.products(id),
  source        text not null,                -- nombre/descr. de la fuente
  source_url    text,
  date_checked  date not null default current_date,
  data_type     text not null check (data_type in
                  ('official_rate','official_document','public_verifiable','commercial_reference')),
  description   text,
  raw_value     text,                          -- lo que se encontró, tal cual (ej. "desde $25")
  variables_needed jsonb not null default '[]',
  usable_for_calculation boolean not null default false,
  confidence    text check (confidence in ('high','medium','low')),
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists ix_rate_research_insurer on public.rate_research(insurer_id, product_id);
comment on column public.rate_research.usable_for_calculation is
  'false para cualquier "desde $X" u otra referencia comercial. Solo true alimenta rate_rows.';

-- ─── COTIZACIÓN ────────────────────────────────────────────────────────────
create table if not exists public.quotes (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid not null references public.contacts(id),
  conversation_id uuid references public.conversations(id),
  product_id      uuid not null references public.products(id),
  inputs          jsonb not null,        -- {"edad":29,"cc":150,"marca":"Bera"}
  status          text not null default 'draft'
                  check (status in ('draft','completed','partial','manual_pending','sent','accepted','rejected','expired')),
  currency        char(3) not null default 'USD',
  best_line_id    uuid,
  recommendation  text,
  missing_insurers text[] not null default '{}',
  expires_at      timestamptz default now() + interval '15 days',
  created_at      timestamptz not null default now()
);
create index if not exists ix_quotes_contact on public.quotes(contact_id, created_at desc);

create table if not exists public.quote_lines (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid not null references public.quotes(id) on delete cascade,
  insurer_id    uuid not null references public.insurers(id),
  source        text not null check (source in ('manual','api','estimate','unavailable')),
  premium       numeric(12,2),
  coverage_sum  numeric(14,2),
  deductible    numeric(12,2),
  coverage_items jsonb not null default '[]',
  commission_pct numeric(5,2),
  commission_amount numeric(12,2),
  rank          int,
  unavailable_reason text,
  created_at    timestamptz not null default now(),
  unique (quote_id, insurer_id)
);
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_best_line'
  ) then
    alter table public.quotes add constraint fk_best_line
      foreign key (best_line_id) references public.quote_lines(id) deferrable initially deferred;
  end if;
end $$;

-- ─── PÓLIZAS, PAGOS, SINIESTROS ────────────────────────────────────────────
-- Nota: contacts.insurance_company/policy_number/insurance_type son solo un
-- snapshot de la póliza más reciente (columnas de texto plano, no soportan
-- varias). Esta tabla es la fuente real para clientes con varias pólizas.
create table if not exists public.policies (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid not null references public.contacts(id),
  insurer_id    uuid not null references public.insurers(id),
  product_id    uuid not null references public.products(id),
  quote_id      uuid references public.quotes(id),
  policy_number text,
  status        text not null default 'active'
                check (status in ('pending','active','lapsed','cancelled','renewed')),
  premium_total numeric(12,2) not null,
  currency      char(3) not null default 'USD',
  payment_frequency text not null default 'annual'
                check (payment_frequency in ('single','monthly','quarterly','semiannual','annual')),
  start_date    date not null,
  end_date      date not null,
  commission_pct numeric(5,2),
  documents     jsonb not null default '[]',
  created_at    timestamptz not null default now()
);
create index if not exists ix_policies_end on public.policies(end_date) where status = 'active';
create index if not exists ix_policies_contact on public.policies(contact_id);
create unique index if not exists ux_policy_number on public.policies(insurer_id, policy_number)
  where policy_number is not null;

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  policy_id   uuid not null references public.policies(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id),
  installment_no int not null default 1,
  amount      numeric(12,2) not null,
  currency    char(3) not null default 'USD',
  due_date    date not null,
  paid_at     timestamptz,
  status      text not null default 'pending'
              check (status in ('pending','paid','overdue','waived','failed')),
  method      text,
  reference   text,
  created_at  timestamptz not null default now(),
  unique (policy_id, installment_no)
);
create index if not exists ix_payments_due on public.payments(due_date, status) where status in ('pending','overdue');

create table if not exists public.claims (
  id            uuid primary key default gen_random_uuid(),
  policy_id     uuid references public.policies(id),
  contact_id    uuid not null references public.contacts(id),
  conversation_id uuid references public.conversations(id),
  claim_number  text,
  incident_at   timestamptz,
  reported_at   timestamptz not null default now(),
  incident_type text,
  description   text,
  location      text,
  severity      text default 'unknown' check (severity in ('unknown','minor','moderate','severe','fatal')),
  status        text not null default 'reported'
                check (status in ('reported','documents_pending','submitted','in_review','approved','rejected','paid','closed')),
  required_docs jsonb not null default '[]',
  received_docs jsonb not null default '[]',
  amount_claimed numeric(14,2),
  amount_paid    numeric(14,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists ix_claims_status on public.claims(status, reported_at desc);

-- ─── CITAS, COMISIONES, ESCALACIÓN, RECORDATORIOS ─────────────────────────
create table if not exists public.appointments (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid not null references public.contacts(id),
  gcal_event_id text unique,
  title         text not null,
  purpose       text,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  status        text not null default 'scheduled'
                check (status in ('scheduled','confirmed','cancelled','completed','no_show')),
  meeting_url   text,
  created_at    timestamptz not null default now(),
  constraint no_overlap exclude using gist (
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('scheduled','confirmed'))
);
create index if not exists ix_appt_start on public.appointments(starts_at) where status in ('scheduled','confirmed');
comment on constraint no_overlap on public.appointments is
  'Capa dura anti-doble-reserva. PostgreSQL es la verdad, Google Calendar es el espejo.';

create table if not exists public.commissions (
  id          uuid primary key default gen_random_uuid(),
  policy_id   uuid not null references public.policies(id) on delete cascade,
  payment_id  uuid references public.payments(id),
  insurer_id  uuid not null references public.insurers(id),
  gross_amount numeric(12,2) not null,
  pct         numeric(5,2) not null,
  net_amount  numeric(12,2) not null,
  currency    char(3) not null default 'USD',
  status      text not null default 'accrued'
              check (status in ('accrued','invoiced','collected','cancelled')),
  period      date not null,
  collected_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists ix_comm_period on public.commissions(period, status);

-- Paquete HUMAN_REQUIRED — Nairobi recibe un caso ya organizado, no un
-- problema en blanco.
create table if not exists public.escalations (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id),
  contact_id      uuid not null references public.contacts(id),
  reason          text not null,
  urgency         text not null default 'normal' check (urgency in ('low','normal','high','emergency')),
  context         jsonb not null default '{}',   -- datos estructurados recopilados
  summary         text,                          -- texto listo para leer en WhatsApp/app
  status          text not null default 'open'
                  check (status in ('open','acknowledged','resolved','dismissed')),
  notified_at     timestamptz,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now()
);
create index if not exists ix_esc_open on public.escalations(status, urgency, created_at desc);

-- Idempotencia de recordatorios de cobranza.
create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,     -- payment_due | policy_renewal | appointment
  ref_table   text not null,
  ref_id      uuid not null,
  window_key  text not null,     -- 'D-7' | 'D-1' | 'D0' | 'D+3'
  contact_id  uuid not null references public.contacts(id),
  scheduled_for timestamptz not null,
  sent_at     timestamptz,
  status      text not null default 'pending'
              check (status in ('pending','sent','skipped','failed')),
  channel     text not null default 'whatsapp',
  error       text,
  created_at  timestamptz not null default now(),
  unique (kind, ref_id, window_key)          -- ← llave de idempotencia
);
create index if not exists ix_rem_due on public.reminders(status, scheduled_for);

create table if not exists public.daily_metrics (
  metric_date date primary key,
  new_leads int default 0,
  quotes_created int default 0,
  policies_sold int default 0,
  gross_premium numeric(14,2) default 0,
  commissions_accrued numeric(14,2) default 0,
  commissions_collected numeric(14,2) default 0,
  claims_opened int default 0,
  appointments_scheduled int default 0,
  overdue_amount numeric(14,2) default 0,
  messages_processed int default 0,
  escalations_created int default 0,
  llm_tokens_in bigint default 0,
  llm_tokens_out bigint default 0,
  llm_cost_usd numeric(10,4) default 0,
  computed_at timestamptz not null default now()
);

create table if not exists public.system_errors (
  id uuid primary key default gen_random_uuid(),
  workflow_name text, execution_id text, node_name text,
  error_message text, payload jsonb,
  created_at timestamptz not null default now()
);

-- Configuración operativa (modo test/production, horarios, etc.)
create table if not exists public.settings (
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
comment on table public.settings is
  'Claves esperadas: mode (test|production), timezone, currency_primary, currency_secondary, '
  'business_hours_start, business_hours_end, emergency_contact_phone, test_allowlist (array).';

-- Configuración de canal WaAPI — nunca hardcodear instancia/número en workflows.
create table if not exists public.channel_config (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,           -- 'test' | 'production'
  is_active     boolean not null default false,
  waapi_instance_id text,
  waapi_endpoint text not null default 'https://waapi.app/api/v1',
  phone_number  text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists ux_channel_active on public.channel_config(is_active) where is_active;

-- ─── MEMORIA DE n8n (memoryPostgresChat) ──────────────────────────────────
create table if not exists public.n8n_chat_histories (
  id serial primary key,
  session_id varchar(255) not null,
  message jsonb not null
);
create index if not exists ix_n8n_chat_session on public.n8n_chat_histories(session_id, id desc);

-- ─── Vista 360 del cliente, para el postgresTool del Agente Nai y para el
-- panel (join contacts + policies reales, no solo el snapshot de 3 columnas)
create or replace view public.v_cliente_360 as
select c.id, c.phone, c.name, c.customer_status,
  (select count(*) from public.policies p where p.contact_id=c.id and p.status='active') as active_policies,
  (select coalesce(sum(pm.amount),0) from public.payments pm
     join public.policies p on p.id=pm.policy_id
    where p.contact_id=c.id and pm.status in ('pending','overdue')) as balance_due,
  (select min(pm.due_date) from public.payments pm
     join public.policies p on p.id=pm.policy_id
    where p.contact_id=c.id and pm.status='pending') as next_due_date,
  (select count(*) from public.claims cl where cl.contact_id=c.id
     and cl.status not in ('closed','rejected')) as open_claims
from public.contacts c;

-- ─── RLS ───────────────────────────────────────────────────────────────
-- n8n opera con service_role (bypassa RLS). Se habilita RLS en todas las
-- tablas nuevas; las policies de lectura para el panel van en policies.sql.
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename in (
        'insurers','products','rate_tables','rate_rows','rate_research',
        'quotes','quote_lines','policies','payments','claims','appointments',
        'commissions','escalations','reminders','daily_metrics',
        'system_errors','settings','channel_config'
      )
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

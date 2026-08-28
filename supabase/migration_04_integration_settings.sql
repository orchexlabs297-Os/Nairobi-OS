-- ============================================================================
-- Nairobi OS — integration_settings (2026-08-19)
-- ============================================================================
-- Contexto: informe "Infraestructura de Integraciones" (2026-08-18). El panel
-- de Configuración necesita mostrar el estado real de sus integraciones
-- (n8n webhook, WhatsApp, Google Calendar) sin escribir nunca directo a
-- Supabase — el flujo real es panel → webhook n8n (W8, recurso
-- "config-update") → n8n escribe acá con service_role.
--
-- Distinta de public.channel_config: channel_config es la config operativa
-- interna que n8n usa para saber a qué instancia enviar (sin policy de
-- lectura, a propósito). integration_settings es el estado visible para el
-- panel — solo metadata operativa, nunca secretos/tokens.
--
-- Aplicar DESPUÉS de que el workflow W8 (rama "config-update") esté probado
-- contra un n8n con credencial Postgres real — mismo criterio que el resto
-- de migraciones de este proyecto (ver DECISIONS.md D004).
-- ============================================================================

create table if not exists public.integration_settings (
  id                uuid primary key default gen_random_uuid(),
  integration_type  text not null
                    check (integration_type in ('n8n_webhook','whatsapp','google_calendar')),
  provider          text,     -- 'waapi' | 'evolution_api' | 'meta_cloud_api' | 'twilio' | 'gupshup' | null
  is_active         boolean not null default false,
  status            text not null default 'pending'
                    check (status in ('connected','pending','error')),
  metadata          jsonb not null default '{}'::jsonb,  -- NUNCA tokens/secretos, ver nota abajo
  last_checked_at   timestamptz,
  updated_by        text,     -- 'panel' | 'n8n' | 'manual'
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists ux_integration_settings_type_provider
  on public.integration_settings(integration_type, coalesce(provider, ''));

comment on table public.integration_settings is
  'Estado operativo de integraciones (n8n_webhook/whatsapp/google_calendar), visible para el '
  'panel vía SELECT. Los secretos reales (tokens WhatsApp, OAuth de Google) viven solo en el '
  'Credentials Store de n8n — cualquier fila legible por authenticated es visible para toda '
  'sesión del panel, así que metadata debe limitarse a datos no sensibles (proveedor activo, '
  'estado, nombre de cuenta, calendar_id, etc).';

alter table public.integration_settings enable row level security;

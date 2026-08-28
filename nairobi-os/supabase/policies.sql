-- ============================================================================
-- Nairobi OS — Políticas RLS para acceso de lectura desde el panel (frontend)
-- ============================================================================
-- Contexto: en nairobi_os_core_schema_v1, las tablas contacts, conversations
-- y messages tienen RLS activo con CERO políticas — es decir, hoy solo el
-- service_role (usado por n8n) puede leer o escribir. Eso es correcto para
-- las escrituras: n8n debe seguir siendo el único escritor.
--
-- Para que este panel privado (autenticado con Supabase Auth) pueda LEER
-- los datos reales, corre este script una sola vez en el SQL editor de tu
-- proyecto (o aplícalo como migración vía Supabase MCP / apply_migration).
--
-- Esto NO abre nada a usuarios anónimos: exige un usuario autenticado
-- (session válida creada desde Authentication → Users en tu proyecto).
-- ============================================================================

-- Lectura de contactos para cualquier usuario autenticado del panel
create policy "Panel: lectura autenticada de contacts"
  on public.contacts
  for select
  to authenticated
  using (true);

-- Lectura de conversaciones para cualquier usuario autenticado del panel
create policy "Panel: lectura autenticada de conversations"
  on public.conversations
  for select
  to authenticated
  using (true);

-- Lectura de mensajes para cualquier usuario autenticado del panel
create policy "Panel: lectura autenticada de messages"
  on public.messages
  for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- Opcional: si más adelante quieres permitir que un agente responda
-- manualmente desde el panel (no solo n8n), añade una política de INSERT
-- acotada, por ejemplo solo para mensajes salientes ("outbound"):
--
-- create policy "Panel: agentes pueden enviar mensajes salientes"
--   on public.messages
--   for insert
--   to authenticated
--   with check (direction = 'outbound');
--
-- Mantén esto deshabilitado si quieres que n8n siga siendo el único
-- escritor, tal como está diseñado el sistema actualmente.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- AÑADIDO 2026-08-16 (Vision) — lectura para las tablas nuevas de
-- migration_02_core_tables.sql. Mismo patrón: solo SELECT para usuarios
-- authenticated del panel, n8n sigue siendo el único escritor (service_role
-- bypassa RLS). Ninguna de estas policies abre nada a usuarios anónimos.
-- ============================================================================

create policy "Panel: lectura authenticated de insurers"
  on public.insurers for select to authenticated using (true);

create policy "Panel: lectura authenticated de products"
  on public.products for select to authenticated using (true);

create policy "Panel: lectura authenticated de rate_tables"
  on public.rate_tables for select to authenticated using (true);

create policy "Panel: lectura authenticated de rate_rows"
  on public.rate_rows for select to authenticated using (true);

create policy "Panel: lectura authenticated de rate_research"
  on public.rate_research for select to authenticated using (true);

create policy "Panel: lectura authenticated de quotes"
  on public.quotes for select to authenticated using (true);

create policy "Panel: lectura authenticated de quote_lines"
  on public.quote_lines for select to authenticated using (true);

create policy "Panel: lectura authenticated de policies"
  on public.policies for select to authenticated using (true);

create policy "Panel: lectura authenticated de payments"
  on public.payments for select to authenticated using (true);

create policy "Panel: lectura authenticated de claims"
  on public.claims for select to authenticated using (true);

create policy "Panel: lectura authenticated de appointments"
  on public.appointments for select to authenticated using (true);

create policy "Panel: lectura authenticated de commissions"
  on public.commissions for select to authenticated using (true);

create policy "Panel: lectura authenticated de escalations"
  on public.escalations for select to authenticated using (true);

create policy "Panel: lectura authenticated de reminders"
  on public.reminders for select to authenticated using (true);

create policy "Panel: lectura authenticated de daily_metrics"
  on public.daily_metrics for select to authenticated using (true);

-- NOTA: no se agrega policy de lectura para channel_config a propósito —
-- son datos operativos/internos que no hace falta exponer al panel.

-- ============================================================================
-- AÑADIDO 2026-08-25 — lectura de settings y system_errors, pedida
-- explícitamente para el panel "Estado real de Nai" en Configuración
-- (MensajesPage/ConfiguracionPage, sesión de n8n). settings solo trae
-- mode/test_allowlist (nada sensible); system_errors puede traer teléfonos
-- en su payload, pero el panel ya está detrás de Supabase Auth.
-- ============================================================================

create policy "Panel: lectura authenticated de settings"
  on public.settings for select to authenticated using (true);

create policy "Panel: lectura authenticated de system_errors"
  on public.system_errors for select to authenticated using (true);

-- ============================================================================
-- AÑADIDO 2026-08-19 (Vision) — lectura para integration_settings
-- (migration_04_integration_settings.sql). A diferencia de channel_config,
-- esta tabla SÍ debe ser legible por el panel: es lo que alimenta el badge
-- "Estado del Sistema" de la pantalla Configuración. Solo guarda metadata
-- operativa, nunca secretos — ver comentario en la propia tabla.
-- ============================================================================

create policy "Panel: lectura authenticated de integration_settings"
  on public.integration_settings for select to authenticated using (true);

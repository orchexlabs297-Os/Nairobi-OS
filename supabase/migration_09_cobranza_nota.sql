-- ============================================================================
-- Nairobi OS — migración 09: nota de cobranza de Nairobi por cuota
-- ============================================================================
-- Pedido de Sebastián (2026-09-10): Nairobi puede VER la cartera de cobranza
-- en el panel pero no puede ACTUAR ni instruirle nada a Noe sobre un cobro
-- puntual (documentado como pendiente de producto en NEXT_STEPS.md/RISKS.md
-- el mismo día). Esta migración cubre la mitad "instruir a Noe": una columna
-- de texto libre que Nairobi escribe desde el panel (Feature B), y que Noe
-- lee con la tool nueva `consultar_cobranza_pendiente` antes de hablar de un
-- cobro con ese cliente (ej. "dale una semana más", "ya se resolvió aparte,
-- no insistir", "cobra el monto completo, no acepta parcial").
--
-- No se reutiliza `payments.reference` (ya tiene otro uso: referencia/recibo
-- del pago) ni se crea una tabla nueva -- una columna nullable alcanza para
-- el alcance pedido hoy, sin sobre-diseñar.
-- ============================================================================

alter table public.payments
  add column if not exists nota_nairobi text;

comment on column public.payments.nota_nairobi is
  'Instrucción libre de Nairobi sobre esta cuota puntual, escrita desde el panel. Noe la lee con la tool consultar_cobranza_pendiente antes de hablar de este cobro con el cliente. NULL = sin instrucción especial.';

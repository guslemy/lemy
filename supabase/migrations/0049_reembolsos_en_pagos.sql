-- Reembolsos de pagos con tarjeta: cuánto se devolvió y cuándo (los llena el
-- webhook de Stripe Connect al recibir charge.refunded). El estado 'refunded'
-- de card_payments ya existía (0047); aquí se agregan los importes.
--
-- Idempotente: se puede correr más de una vez sin problema.

alter table public.card_payments
  add column if not exists refunded_cents integer not null default 0,
  add column if not exists refunded_at timestamptz;

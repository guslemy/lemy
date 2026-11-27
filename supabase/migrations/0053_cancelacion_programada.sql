-- Fecha en que termina una suscripción cuya cancelación ya quedó programada
-- (cancelar al final del periodo). NULL = sin cancelación programada. La
-- mantienen las acciones de cancelar/reanudar y el webhook de Stripe.
alter table public.therapists
  add column if not exists subscription_cancel_at timestamptz;

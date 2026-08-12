-- El terapeuta ahora decide explícitamente qué métodos de pago acepta por
-- consulta (checkboxes en /dashboard/pagos), en vez de que Lemy lo infiera
-- solo de si tiene Stripe Connect conectado. Default true en ambos para no
-- romper nada: hoy todo terapeuta ya acepta efectivo implícitamente, y quien
-- ya tiene Connect activo ya acepta tarjeta implícitamente — este default
-- preserva ese comportamiento hasta que alguien entre y decida lo contrario.
-- Importante: accepts_card_payment es la INTENCIÓN del terapeuta, no
-- garantiza que ya pueda cobrar con tarjeta de verdad — eso sigue
-- dependiendo de stripe_connect_charges_enabled (ver [slug]/page.tsx y
-- lib/appointments.ts, que combinan ambas antes de ofrecérselo al paciente).
alter table public.therapists
  add column if not exists accepts_card_payment boolean not null default true;
alter table public.therapists
  add column if not exists accepts_cash_payment boolean not null default true;

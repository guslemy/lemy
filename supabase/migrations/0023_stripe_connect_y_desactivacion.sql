-- Stripe Connect (pago directo terapeuta→paciente, estilo Uber/Rappi) +
-- desactivación reversible de cuentas desde el panel de admin.

-- Estado real de la cuenta de Stripe Connect del terapeuta. No basta con
-- guardar el id de la cuenta (stripe_connect_account_id, que ya existía
-- desde el MVP) — hasta que Stripe confirma charges_enabled=true la cuenta
-- no puede recibir cobros, así que el buscador/perfil público necesita
-- este booleano para decidir si mostrar el botón de agendar.
alter table public.therapists
  add column if not exists stripe_connect_charges_enabled boolean not null default false;
alter table public.therapists
  add column if not exists stripe_connect_details_submitted boolean not null default false;

-- Guardamos el id de la Checkout Session (no solo el payment_intent) porque
-- el webhook de checkout.session.completed llega antes de tener el
-- payment_intent expandido en algunos casos, y sirve para reconciliar si
-- el paciente reintenta el pago.
alter table public.appointments
  add column if not exists stripe_checkout_session_id text;
alter table public.appointments
  add column if not exists application_fee_cents integer;

-- Desactivación reversible de cuentas desde /dashboard/admin (a diferencia
-- del reset masivo de prueba, que sí borra todo de verdad). Vive en
-- profiles porque es la tabla base 1:1 con auth.users para cualquier rol.
alter table public.profiles
  add column if not exists deactivated_at timestamptz;

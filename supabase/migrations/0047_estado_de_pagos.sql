-- Estado de los pagos con tarjeta (Stripe Connect): una fila por cita pagada.
--
-- Antes solo se guardaba appointments.payment_status = 'paid'; no había dónde
-- ver cuánto se cobró, cuánto le queda al terapeuta, cuándo debería llegarle
-- el dinero ni si Stripe ya lo depositó. Esta tabla lo registra (la llena el
-- webhook de Stripe Connect, src/app/api/stripe/webhook-connect/route.ts).
--
-- Importes en centavos de MXN. net_cents / fechas pueden quedar null si
-- Stripe tardó en darlos; el tablero lo muestra como "por confirmar".
--
-- Idempotente: se puede correr más de una vez sin problema.

create table if not exists public.card_payments (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  therapist_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null,
  lemy_fee_cents integer not null default 0,
  stripe_fee_cents integer,
  net_cents integer,
  currency text not null default 'mxn',
  card_brand text,
  card_last4 text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  paid_at timestamptz not null default now(),
  expected_available_on date,
  -- paid = cobrado, dinero en Stripe aún por depositar
  -- deposited = Stripe ya lo depositó en el banco del terapeuta
  -- payout_failed = el depósito falló (cuenta bancaria con problema)
  status text not null default 'paid'
    check (status in ('paid', 'deposited', 'payout_failed', 'refunded')),
  deposited_at timestamptz,
  stripe_payout_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists card_payments_therapist_idx
  on public.card_payments (therapist_id, paid_at desc);
create index if not exists card_payments_patient_idx
  on public.card_payments (patient_id, paid_at desc);
create index if not exists card_payments_charge_idx
  on public.card_payments (stripe_charge_id)
  where stripe_charge_id is not null;

alter table public.card_payments enable row level security;

-- Cada quien ve solo sus pagos. Solo el servidor (service_role) escribe.
drop policy if exists card_payments_participants_read on public.card_payments;
create policy card_payments_participants_read on public.card_payments
  for select
  using (auth.uid() = therapist_id or auth.uid() = patient_id);

-- Pagos con tarjeta que ya existían antes de esta tabla (hoy: 1, de Gema,
-- 14 nov 2026). Se registran como "cobrado" con lo que ya sabemos; no se manda
-- ningún correo por ellos. Comisión de Stripe y neto quedan por confirmar.
insert into public.card_payments
  (appointment_id, therapist_id, patient_id, amount_cents, lemy_fee_cents, paid_at, status)
select a.id, a.therapist_id, a.patient_id,
       round(a.price * 100)::int, coalesce(a.application_fee_cents, 0), a.created_at, 'paid'
from public.appointments a
where a.payment_status = 'paid'
on conflict (appointment_id) do nothing;

-- Cobro de Stripe de ese pago (visto en Stripe: comisión de Lemy $20.00).
update public.card_payments
set stripe_charge_id = 'ch_3UbXRi2aCXRBdybs157SjfbY'
where appointment_id = 'a1d4c149-ef32-456b-a1dd-38f344fe5ef2'
  and stripe_charge_id is null;

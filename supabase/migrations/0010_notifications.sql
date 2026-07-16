-- Etapa F: motor de notificaciones (email + WhatsApp).
--
-- subscription_current_period_end: Stripe movió este dato del nivel
-- "subscription" al nivel "subscription item" en su API 2025-03-31 (Basil).
-- Lo guardamos aquí nosotros mismos (sincronizado desde el webhook) para no
-- tener que llamar a la API de Stripe en cada corrida del cron.
alter table public.therapists add column if not exists subscription_current_period_end timestamptz;

-- notification_log: evita que el cron (que corre cada 15 min) mande la
-- misma notificación dos veces. Cada combinación tipo+relacionado+canal
-- solo se manda una vez.
create table if not exists public.notification_log (
  id uuid primary key default uuid_generate_v4(),
  notification_type text not null, -- 'trial_5d' | 'trial_1d' | 'renewal_3d' | 'renewal_1d' | 'appointment_1d' | 'appointment_1h'
  related_id uuid not null,        -- id del terapeuta o de la cita, según el tipo
  channel text not null,           -- 'email' | 'whatsapp'
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (notification_type, related_id, channel)
);

alter table public.notification_log enable row level security;
-- A propósito sin políticas: solo el cron (service_role) escribe/lee aquí.

-- Historial de correos enviados: a petición de Gustavo (2026-09-27), para
-- poder revisar el contenido exacto de un correo que un cliente recibió en
-- tal día y hora ("¿qué decía el correo que me llegó el martes a las 5?").
--
-- notification_log (0010_notifications.sql) solo guarda tipo+destinatario+
-- fecha para evitar duplicados — nunca guardó el asunto ni el HTML real, así
-- que no sirve para esto. Esta tabla es independiente y solo se llena hacia
-- adelante (correos mandados antes de este cambio no van a aparecer aquí).
create table if not exists public.email_log (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  notification_type text not null,
  subject text not null,
  html text not null,
  sent_at timestamptz not null default now()
);

create index if not exists email_log_recipient_id_idx on public.email_log (recipient_id);
create index if not exists email_log_recipient_email_idx on public.email_log (recipient_email);
create index if not exists email_log_sent_at_idx on public.email_log (sent_at desc);

alter table public.email_log enable row level security;
-- A propósito sin políticas, igual que notification_log: solo el
-- service_role (el motor de notificaciones y las server actions de admin)
-- escribe/lee aquí — ningún usuario debe poder ver correos de otros.

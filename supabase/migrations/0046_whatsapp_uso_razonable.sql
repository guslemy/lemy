-- "Uso razonable" de WhatsApp: cada mensaje de WhatsApp se atribuye al
-- terapeuta cuyo plan lo cubre (billed_to): el terapeuta mismo en avisos de
-- suscripción o a su propia cuenta, y el terapeuta de la cita en avisos a sus
-- pacientes. Así se puede contar cuántos se han mandado en el mes por
-- terapeuta y frenar el envío automático al pasar el límite (ver
-- WA_MONTHLY_CAP en src/lib/whatsapp-templates.ts y whatsappGate en
-- src/lib/notifications/engine.ts). El correo sigue saliendo igual.
alter table public.notification_log
  add column if not exists billed_to uuid references public.profiles(id) on delete set null;

create index if not exists notification_log_billed_to_idx
  on public.notification_log (billed_to, channel, sent_at);

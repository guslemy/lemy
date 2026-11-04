-- Permiso explícito para recibir avisos por WhatsApp (opt-in).
--
-- Meta (WhatsApp Business) y la ley de datos personales piden que la persona
-- haya aceptado recibir mensajes por este canal. Por eso es un campo propio,
-- separado de email_whatsapp_enabled (0034, que ahora solo controla el correo):
--   * whatsapp_opt_in      → true solo si la persona lo aceptó (casilla sin
--                            marcar por defecto, o interruptor en su panel).
--   * whatsapp_opt_in_at   → cuándo lo aceptó (evidencia del consentimiento).
--   * whatsapp_opt_out_at  → cuándo se dio de baja (interruptor o respondió
--                            "BAJA" al mensaje).
-- Todas las cuentas existentes empiezan SIN permiso: nadie recibe WhatsApp
-- automático hasta que lo acepte.
alter table public.profiles
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists whatsapp_opt_in_at timestamptz,
  add column if not exists whatsapp_opt_out_at timestamptz;

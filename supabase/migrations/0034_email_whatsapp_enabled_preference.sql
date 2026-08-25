-- Segundo interruptor de notificaciones, separado del de push (ver
-- 0033_push_enabled_preference.sql) — a petición explícita de Gustavo
-- (2026-08-25): apagar push no debía apagar correo/WhatsApp también, y
-- viceversa, así que son dos columnas independientes en vez de una.
--
-- Importante: este campo NO aplica a los avisos esenciales del ciclo de
-- vida de una cita (solicitud, confirmación, cancelación, reagendado) — esos
-- se siguen mandando siempre, sin importar este valor (ver ESSENTIAL_TYPES
-- en src/lib/notifications/engine.ts). Solo gatea lo no esencial:
-- recordatorios 1 día / 1 hora antes, petición y aviso de reseña,
-- recordatorios de renovación de plan, checklist de onboarding, invitación
-- de referidos.
alter table public.profiles
  add column if not exists email_whatsapp_enabled boolean not null default true;

-- A petición de Gustavo (2026-09-21), tres features nuevas que comparten
-- esta migración por simplicidad:

-- 1) Link opcional a la política de reservas propia del terapeuta —
-- aparece en su perfil público como "Revisa mi política de reservas aquí:".
alter table public.therapists
  add column if not exists booking_policy_url text;

-- 2) Vencimiento de una cita que el TERAPEUTA agendó directo desde la ficha
-- de un paciente (status = 'pending_patient_acceptance', un valor nuevo de
-- appointments.status — la columna es texto libre desde 0001_init.sql, sin
-- check constraint, así que no hace falta migración aparte para "agregarlo
-- al enum"). El paciente tiene 24 horas para aceptar (y pagar, si aplica) o
-- rechazar; si no responde, un barrido del cron existente
-- (runNotificationSweep, cada 15 min) cancela la cita y libera el horario
-- solo. Nulo para cualquier cita que no sea de este tipo.
alter table public.appointments
  add column if not exists patient_acceptance_expires_at timestamptz;

-- 3) Nada de esquema para el pop-up de "confirmar asistencia" — reutiliza
-- appointments.status = 'completed', que ya existía en el comentario de
-- 0001_init.sql desde el principio pero ningún código lo asignaba todavía.

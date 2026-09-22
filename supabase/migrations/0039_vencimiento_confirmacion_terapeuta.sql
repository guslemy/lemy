-- A petición de Gustavo (2026-09-21): el mismo margen de 24 horas que ya
-- tiene "pending_patient_acceptance" (migración 0038) debe aplicar también
-- al lado del terapeuta — cualquier cita que quede en "pending_payment"
-- esperando que el terapeuta le dé "Confirmar y crear evento" (venga de una
-- solicitud normal del paciente, en efectivo o con tarjeta, o de que el
-- paciente aceptó una propuesta del terapeuta) tiene 24 horas desde que
-- entra a ese estado. Si el terapeuta no confirma a tiempo, el barrido del
-- cron (runNotificationSweep, cada 15 min) cancela la cita sola y libera el
-- horario — con reembolso automático si ya se había cobrado con tarjeta
-- (ver refundAppointmentPayment en lib/appointment-checkout.ts).
--
-- Columna separada de patient_acceptance_expires_at (0038) a propósito: son
-- dos plazos distintos que nunca aplican al mismo tiempo (uno es "el
-- paciente debe responder", el otro es "el terapeuta debe confirmar"), pero
-- conviene no mezclarlos en una sola columna para que quede claro en cada
-- fila de qué plazo se trata con solo ver el status.
alter table public.appointments
  add column if not exists therapist_confirmation_expires_at timestamptz;

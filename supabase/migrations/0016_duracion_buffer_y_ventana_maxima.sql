-- Duración de consulta + espacio de descanso entre citas, y ventana MÁXIMA
-- de reserva a futuro (complementa booking_lead_amount/unit de la migración
-- 0013, que solo controlaba el mínimo de anticipación).

alter table therapists
  add column if not exists session_duration_min int not null default 50
    check (session_duration_min in (30, 45, 50, 60, 75, 90)),
  add column if not exists buffer_min int not null default 0
    check (buffer_min in (0, 15, 30, 60)),
  add column if not exists booking_max_amount int not null default 3
    check (booking_max_amount >= 1 and booking_max_amount <= 90),
  add column if not exists booking_max_unit text not null default 'meses'
    check (booking_max_unit in ('dias', 'semanas', 'meses'));

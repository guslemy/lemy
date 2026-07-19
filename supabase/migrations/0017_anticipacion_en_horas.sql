-- Permite "horas" como unidad de anticipación MÍNIMA (además de 0 como
-- cantidad válida, que ya no requiere cambio de esquema — booking_lead_amount
-- nunca tuvo un check de rango en la base de datos, solo en el server action).
-- El nombre del constraint es el que Postgres generó automáticamente al
-- crear la columna en la migración 0013 (patrón <tabla>_<columna>_check).

alter table therapists
  drop constraint if exists therapists_booking_lead_unit_check;

alter table therapists
  add constraint therapists_booking_lead_unit_check
    check (booking_lead_unit in ('horas', 'dias', 'semanas', 'meses'));

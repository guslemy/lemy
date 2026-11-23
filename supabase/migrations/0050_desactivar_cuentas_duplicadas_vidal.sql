-- Limpieza de cuentas duplicadas de Vidal (2026-11-22). Se conserva la cuenta
-- de Google (vidal.lopra@gmail.com, id cddf71fb-...). Las otras dos se
-- despublican y se desactivan (reversible: se pueden reactivar quitando
-- deactivated_at). No se borra nada: la cuenta de Hotmail conserva 2 citas
-- ya canceladas (ninguna pendiente), una con una paciente real.
--
-- Cuentas:
--   f32002e6-5569-48bf-b8b8-4784e215a53d  vidal.lopra@hotmail.com   (daniel-vidal)
--   d72f6d83-13a2-4f40-a737-292f61ad9bdc  ramirezvidallopez@gmail.com (vidal-lopez-ramirez)
--
-- Idempotente.

update public.therapists
set is_published = false
where id in (
  'f32002e6-5569-48bf-b8b8-4784e215a53d',
  'd72f6d83-13a2-4f40-a737-292f61ad9bdc'
);

update public.profiles
set deactivated_at = now()
where id in (
  'f32002e6-5569-48bf-b8b8-4784e215a53d',
  'd72f6d83-13a2-4f40-a737-292f61ad9bdc'
)
and deactivated_at is null;

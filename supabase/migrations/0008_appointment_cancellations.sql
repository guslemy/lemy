-- Cancelaciones: quién canceló, por qué, y cuándo. Sirve para que el
-- terapeuta vea su propia tasa de cancelación, y más adelante (con Stripe)
-- para exigir pago por adelantado a pacientes que cancelan mucho.
-- Idempotente: solo agrega columnas si no existen ya.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'cancelled_by'
  ) then
    alter table public.appointments add column cancelled_by text; -- 'patient' | 'therapist'
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'cancellation_reason'
  ) then
    alter table public.appointments add column cancellation_reason text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'cancelled_at'
  ) then
    alter table public.appointments add column cancelled_at timestamptz;
  end if;
end $$;

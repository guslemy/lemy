-- Suscripción de terapeutas (Etapa E1): 15 días de prueba gratis para
-- todos, y estatus de "fundador" para los primeros 30 (30% de descuento
-- 3 meses + precio bloqueado 1 año, ya decidido en el plan de precios).

alter table public.therapists add column if not exists trial_ends_at timestamptz;
alter table public.therapists add column if not exists is_founding_member boolean not null default false;

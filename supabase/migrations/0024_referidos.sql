-- Programa de referidos entre terapeutas: quien invita gana 30% de
-- descuento en su siguiente mensualidad cuando la persona invitada empieza
-- a pagar su propia suscripción.

alter table public.therapists
  add column if not exists referred_by uuid references public.therapists(id);

-- Evita que el mismo referido dispare el descuento más de una vez (por
-- ejemplo si cancela y se vuelve a suscribir después).
alter table public.therapists
  add column if not exists referral_bonus_granted boolean not null default false;

-- Perfiles públicos solo durante la prueba gratis (15 días) o con suscripción.
--
-- Antes: un perfil publicado se veía para siempre aunque la prueba hubiera
-- vencido sin suscripción. Ahora la visibilidad pública (directorio, buscador,
-- /[slug], mapa del sitio, reservas) exige: publicado Y (suscripción activa /
-- en prueba / pago atrasado, O prueba o gracia todavía vigente).
--
-- Se aplica en la política de seguridad (RLS) para que valga en TODAS las
-- lecturas públicas a la vez, sin tocar cada consulta. El propio terapeuta
-- sigue viendo siempre su fila. Es reversible: si se suscribe, reaparece solo.
--
-- visible_until = gracia: a los perfiles que YA venció su prueba hoy se les da
-- 3 días más (se les avisa por correo antes de ocultarse).
--
-- Idempotente: se puede correr más de una vez sin problema.

alter table public.therapists
  add column if not exists visible_until timestamptz;

update public.therapists
set visible_until = now() + interval '3 days'
where is_published = true
  and coalesce(subscription_status, 'inactive') not in ('active', 'trialing', 'past_due')
  and trial_ends_at is not null
  and trial_ends_at <= now()
  and visible_until is null;

drop policy if exists therapists_public_read on public.therapists;
create policy therapists_public_read on public.therapists
  for select
  using (
    auth.uid() = id
    or (
      is_published = true
      and (
        coalesce(subscription_status, 'inactive') in ('active', 'trialing', 'past_due')
        or greatest(
             coalesce(trial_ends_at, '-infinity'::timestamptz),
             coalesce(visible_until, '-infinity'::timestamptz)
           ) > now()
      )
    )
  );

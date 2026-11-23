-- Verificación obligatoria para que un perfil sea público.
--
-- En el sitio decimos "perfiles verificados", así que un perfil solo se ve en
-- el directorio, el buscador, /[slug], el mapa del sitio y para reservar si:
--   publicado Y verificado Y (suscripción vigente O prueba/gracia vigente).
-- El propio terapeuta siempre ve su fila. Reversible: al quedar verificado,
-- el perfil reaparece solo.
--
-- Reemplaza la política de 0048_visibilidad_por_plan (agrega la verificación).
-- Idempotente.

drop policy if exists therapists_public_read on public.therapists;
create policy therapists_public_read on public.therapists
  for select
  using (
    auth.uid() = id
    or (
      is_published = true
      and verification_status = 'verified'
      and (
        coalesce(subscription_status, 'inactive') in ('active', 'trialing', 'past_due')
        or greatest(
             coalesce(trial_ends_at, '-infinity'::timestamptz),
             coalesce(visible_until, '-infinity'::timestamptz)
           ) > now()
      )
    )
  );

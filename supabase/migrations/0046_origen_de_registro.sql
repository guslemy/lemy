-- Origen de registro (UTM) — de qué campaña, correo o sitio llegó cada persona
-- que creó una cuenta. Antes los utm_* de un enlace como
--   lemy.mx/login?flujo=terapeuta&utm_source=psicowork&utm_medium=email&utm_campaign=alianza
-- se perdían al pasar por Google o por el correo de confirmación.
--
-- Se capturan en una cookie (src/proxy.ts) y se guardan aquí al crearse el
-- perfil (src/lib/supabase/ensure-profile.ts). Primera visita con utm gana
-- (first touch). Solo cuentas creadas a partir de ahora: las anteriores
-- quedan en null.
--
-- Idempotente: se puede correr más de una vez sin problema.

alter table public.profiles
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists signup_landing_path text,
  add column if not exists signup_referrer text,
  add column if not exists utm_captured_at timestamptz;

-- Para contar registros por campaña en la pestaña Insights del admin.
create index if not exists profiles_utm_campaign_idx
  on public.profiles (utm_campaign)
  where utm_campaign is not null;

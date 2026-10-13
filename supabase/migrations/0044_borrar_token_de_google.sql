-- Borra el refresh token de Google de un usuario: elimina el secreto cifrado
-- de Supabase Vault y la fila que lo apunta, y apaga la bandera de conexión.
--
-- Por qué existe (2026-10-13): al cerrar una cuenta, la fila de
-- google_calendar_tokens sobrevivía (0041 quitó los cascades a propósito para
-- conservar expedientes) y el secreto del Vault quedaba huérfano para siempre.
-- Google exige que el aviso de privacidad diga cuándo se elimina la
-- información de Google del usuario, y que eso sea cierto.
--
-- Solo el service_role puede ejecutarla (igual que save/get_google_refresh_token
-- en 0007). Es idempotente: si el usuario no tiene token, no hace nada.

create or replace function public.delete_google_refresh_token(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  select refresh_token_secret_id into v_secret_id
  from public.google_calendar_tokens
  where user_id = p_user_id;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
    delete from public.google_calendar_tokens where user_id = p_user_id;
  end if;

  update public.therapists
    set google_calendar_connected = false
    where id = p_user_id;
end;
$$;

revoke all on function public.delete_google_refresh_token(uuid) from public, anon, authenticated;
grant execute on function public.delete_google_refresh_token(uuid) to service_role;

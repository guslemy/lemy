-- Guarda el refresh token de Google (para crear eventos de Calendar en
-- nombre del terapeuta) cifrado en Supabase Vault — nunca en texto plano.
-- Solo el service_role puede leerlo/escribirlo, a través de las funciones
-- de abajo. Ni el propio dueño puede leerlo desde el cliente.

create table if not exists public.google_calendar_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  refresh_token_secret_id uuid not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_tokens enable row level security;
-- A propósito, sin políticas de select/insert/update/delete: por default
-- RLS niega todo. Solo el service_role (que ignora RLS) o las funciones
-- security definer de abajo pueden tocar esta tabla.

create or replace function public.save_google_refresh_token(p_user_id uuid, p_refresh_token text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_existing_secret_id uuid;
  v_new_secret_id uuid;
begin
  select refresh_token_secret_id into v_existing_secret_id
  from public.google_calendar_tokens
  where user_id = p_user_id;

  if v_existing_secret_id is not null then
    perform vault.update_secret(v_existing_secret_id, p_refresh_token);
    update public.google_calendar_tokens
      set updated_at = now()
      where user_id = p_user_id;
  else
    select vault.create_secret(
      p_refresh_token,
      'google_refresh_token_' || p_user_id::text,
      'Refresh token de Google Calendar del usuario ' || p_user_id::text
    ) into v_new_secret_id;

    insert into public.google_calendar_tokens (user_id, refresh_token_secret_id)
    values (p_user_id, v_new_secret_id);
  end if;

  update public.therapists
    set google_calendar_connected = true
    where id = p_user_id;
end;
$$;

create or replace function public.get_google_refresh_token(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_token text;
begin
  select ds.decrypted_secret into v_token
  from vault.decrypted_secrets ds
  join public.google_calendar_tokens t on t.refresh_token_secret_id = ds.id
  where t.user_id = p_user_id;

  return v_token;
end;
$$;

revoke all on function public.save_google_refresh_token(uuid, text) from public, anon, authenticated;
revoke all on function public.get_google_refresh_token(uuid) from public, anon, authenticated;
grant execute on function public.save_google_refresh_token(uuid, text) to service_role;
grant execute on function public.get_google_refresh_token(uuid) to service_role;

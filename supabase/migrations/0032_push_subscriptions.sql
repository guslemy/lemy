-- Notificaciones push (Web Push estándar — funciona en Android/desktop
-- directo desde el navegador, y en iOS 16.4+ solo si el sitio ya está
-- instalado en pantalla de inicio, ver AddToHomeScreenPrompt). Un usuario
-- puede tener varias suscripciones (un celular, una laptop, etc.) — por eso
-- es una tabla aparte y no una columna en profiles.
create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Sin lectura pública a propósito (a diferencia de reviews/therapist_services):
-- estos son datos de infraestructura del navegador de cada quien, no algo
-- que otro usuario o visitante anónimo necesite ver nunca. El envío real lo
-- hace siempre el cliente de servicio (bypassa RLS), igual que el resto del
-- motor de notificaciones.
drop policy if exists "push_subscriptions_owner_all" on public.push_subscriptions;
create policy "push_subscriptions_owner_all" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

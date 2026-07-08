-- Contenido educativo (videos de Lemy en YouTube/redes) ligado a una
-- especialidad. Aparece en /buscar cuando alguien filtra por ese tema.
-- Gestionado desde el panel /dashboard/contenido (solo profiles.role = 'admin').

create table public.educational_content (
  id uuid primary key default uuid_generate_v4(),
  specialty_id uuid not null references public.specialties(id) on delete cascade,
  title text not null,
  platform text not null default 'youtube', -- youtube | instagram | tiktok | otro
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.educational_content enable row level security;

create policy "educational_content_public_read" on public.educational_content for select using (true);

create policy "educational_content_admin_insert" on public.educational_content for insert with check (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

create policy "educational_content_admin_update" on public.educational_content for update using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

create policy "educational_content_admin_delete" on public.educational_content for delete using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

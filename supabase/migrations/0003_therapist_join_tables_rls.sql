-- therapist_specialties y therapist_approaches quedaron sin políticas de RLS
-- explícitas en 0001_init.sql. Lectura pública (la necesitan /buscar y el
-- perfil público), escritura solo por el propio terapeuta dueño del registro.
-- Necesaria para que el formulario de edición de perfil (/dashboard/perfil)
-- guarde de forma segura.

alter table public.therapist_specialties enable row level security;
alter table public.therapist_approaches enable row level security;

create policy "therapist_specialties_public_read" on public.therapist_specialties for select using (true);
create policy "therapist_specialties_owner_insert" on public.therapist_specialties for insert with check (auth.uid() = therapist_id);
create policy "therapist_specialties_owner_delete" on public.therapist_specialties for delete using (auth.uid() = therapist_id);

create policy "therapist_approaches_public_read" on public.therapist_approaches for select using (true);
create policy "therapist_approaches_owner_insert" on public.therapist_approaches for insert with check (auth.uid() = therapist_id);
create policy "therapist_approaches_owner_delete" on public.therapist_approaches for delete using (auth.uid() = therapist_id);

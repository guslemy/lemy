-- Un video puede hablar de más de un tema: pasamos de "specialty_id" (una
-- sola especialidad por video) a una tabla puente muchos-a-muchos, igual
-- patrón que therapist_specialties.

create table public.educational_content_specialties (
  content_id uuid references public.educational_content(id) on delete cascade,
  specialty_id uuid references public.specialties(id) on delete cascade,
  primary key (content_id, specialty_id)
);

alter table public.educational_content_specialties enable row level security;

create policy "educational_content_specialties_public_read" on public.educational_content_specialties for select using (true);

create policy "educational_content_specialties_admin_insert" on public.educational_content_specialties for insert with check (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

create policy "educational_content_specialties_admin_delete" on public.educational_content_specialties for delete using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Migra cualquier dato que ya hayas cargado con el specialty_id viejo antes
-- de quitar la columna (no truena si la tabla está vacía).
insert into public.educational_content_specialties (content_id, specialty_id)
select id, specialty_id from public.educational_content
where specialty_id is not null
on conflict do nothing;

alter table public.educational_content drop column specialty_id;

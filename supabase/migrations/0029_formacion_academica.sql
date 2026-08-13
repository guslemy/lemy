-- Formación de posgrado y formación continua (items 3 y 14 del Notion de
-- perfil de terapeuta) — Gustavo confirmó el 2026-08-13 que ambas son
-- visibles en el perfil público, y pidió avanzar mientras se resuelve por
-- separado el tema de documentos de verificación.
--
-- OJO: "Formación continua" en el Notion incluye un campo "Documento
-- comprobatorio" (subir archivo) — se deja fuera por ahora a propósito.
-- Ese campo debería usar el mismo mecanismo (bucket privado + revisión) que
-- se está diseñando para los documentos de verificación (cédula, título,
-- identificación) — no tenía sentido construir un segundo sistema de
-- subida de archivos ad-hoc antes de resolver ese diseño general.
--
-- Ambas tablas son públicamente legibles (mismo patrón que
-- therapist_specialties/therapist_approaches en 0003: RLS "for select using
-- (true)", sin condicionar a is_published, porque la fila padre en
-- `therapists` ya filtra eso en la query real de /[slug]).

create table public.therapist_postgraduate_studies (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  degree_type text not null,       -- 'Especialidad' | 'Maestría' | 'Doctorado' | 'Diplomado' | 'Certificación'
  program_name text not null,
  institution text not null,
  completion_year int,
  license_number text,             -- # de cédula profesional, si aplica a este posgrado
  created_at timestamptz not null default now()
);

create table public.therapist_continuing_education (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  education_type text not null,    -- 'Curso' | 'Diplomado' | 'Certificación' | 'Taller' | 'Seminario' | 'Congreso' | 'Supervisión clínica'
  name text not null,
  institution text,
  year int,
  hours int,
  created_at timestamptz not null default now()
);

alter table public.therapist_postgraduate_studies enable row level security;
alter table public.therapist_continuing_education enable row level security;

create policy "postgrad_public_read" on public.therapist_postgraduate_studies for select using (true);
create policy "postgrad_owner_insert" on public.therapist_postgraduate_studies for insert with check (auth.uid() = therapist_id);
create policy "postgrad_owner_update" on public.therapist_postgraduate_studies for update using (auth.uid() = therapist_id);
create policy "postgrad_owner_delete" on public.therapist_postgraduate_studies for delete using (auth.uid() = therapist_id);

create policy "continuing_ed_public_read" on public.therapist_continuing_education for select using (true);
create policy "continuing_ed_owner_insert" on public.therapist_continuing_education for insert with check (auth.uid() = therapist_id);
create policy "continuing_ed_owner_update" on public.therapist_continuing_education for update using (auth.uid() = therapist_id);
create policy "continuing_ed_owner_delete" on public.therapist_continuing_education for delete using (auth.uid() = therapist_id);

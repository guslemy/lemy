-- Notas privadas de un terapeuta sobre uno de sus pacientes. Son privadas
-- por terapeuta (no un campo del perfil del paciente) — dos terapeutas
-- distintos que compartan un mismo paciente nunca ven las notas del otro.
create table if not exists public.therapist_patient_notes (
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (therapist_id, patient_id)
);

alter table public.therapist_patient_notes enable row level security;

create policy "therapist_patient_notes_own" on public.therapist_patient_notes
  for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

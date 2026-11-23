-- Pacientes "quitados de mi lista" por el terapeuta.
-- No se borra nada: el expediente y las citas se conservan (NOM-004). Solo se
-- oculta al paciente de la lista y la búsqueda de ese terapeuta, y se puede
-- restaurar cuando quiera.

create table if not exists public.therapist_hidden_patients (
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (therapist_id, patient_id)
);

alter table public.therapist_hidden_patients enable row level security;

drop policy if exists "therapist_hidden_patients_own" on public.therapist_hidden_patients;
create policy "therapist_hidden_patients_own" on public.therapist_hidden_patients
  for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

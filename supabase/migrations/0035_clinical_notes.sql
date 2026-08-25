-- Historial clínico: notas de sesión exclusivas del terapeuta, cifradas a
-- nivel de aplicación (AES-256-GCM, ver src/lib/clinical-notes-crypto.ts —
-- la llave vive solo en el servidor, nunca en el navegador). El contenido
-- nunca se guarda en texto plano; esta tabla solo almacena el resultado
-- cifrado más lo necesario para descifrarlo (iv, auth_tag).
--
-- Distinta de `therapist_patient_notes` (el cuadro de "Notas privadas" que
-- ya existía, un solo texto editable por paciente, sin cifrar) — esta es
-- una bitácora de sesión por sesión, no un scratchpad. Ambas conviven.
--
-- Inmutable por diseño: a propósito NO hay política de UPDATE (ver abajo),
-- así que ni siquiera con el JWT del propio terapeuta se puede editar una
-- nota ya guardada — solo insertar nuevas y dar de baja suave (deleted_at)
-- vía el service client, después de validar en el servidor que quien pide
-- el borrado es dueño de la nota (softDeleteClinicalNote en
-- src/app/dashboard/pacientes/clinical-notes-actions.ts).
create table public.clinical_notes (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index clinical_notes_therapist_patient_idx
  on public.clinical_notes (therapist_id, patient_id, created_at desc);

alter table public.clinical_notes enable row level security;

-- Solo lectura e inserción para el propio terapeuta — sin política de
-- UPDATE (ni siquiera el dueño puede editar vía RLS) y sin política de
-- DELETE (el borrado real nunca ocurre, solo el soft-delete server-side
-- con el service client, que de por sí bypassa RLS).
create policy "clinical_notes_therapist_read" on public.clinical_notes
  for select using (auth.uid() = therapist_id);
create policy "clinical_notes_therapist_insert" on public.clinical_notes
  for insert with check (auth.uid() = therapist_id);

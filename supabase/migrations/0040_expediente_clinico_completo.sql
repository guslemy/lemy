-- Ficha del paciente completa (plan Gestiona) — expediente clínico
-- estructurado, basado en el mockup de HTML que compartió el colaborador de
-- Gustavo, adaptado al esquema existente de Lemy. Decisiones confirmadas por
-- Gustavo en la conversación del 2026-09-22:
--
-- - Todo lo cifrado usa el mismo AES-256-GCM de clinical_notes (0035) — la
--   llave (CLINICAL_NOTES_ENCRYPTION_KEY) no es "zero-knowledge" (vive en el
--   servidor), así que cifrar no bloquea ni exportar a PDF ni buscar: el
--   servidor puede descifrar cuando hace falta, igual que ya hace hoy para
--   mostrar clinical_notes.
-- - Datos generales (contacto/demográficos) van SIN cifrar — son del
--   terapeuta (los llena él, no el paciente) y equivalen al expediente en
--   papel que debe conservar 5 años por la NOM-004-SSA3-2012; no son el tipo
--   de dato clínico sensible que justificó cifrar clinical_notes.
-- - Historia clínica, notas de sesión y evaluaciones SÍ van cifradas
--   (contenido narrativo/clínico sensible).
-- - Todo queda scoped por (therapist_id, patient_id) — historia clínica y
--   notas son privadas POR terapeuta, dos terapeutas que comparten un mismo
--   paciente nunca se ven el uno al otro (mismo principio que
--   therapist_patient_notes en 0021).

-- ─────────────────────────────────────────────
-- Datos generales — sin cifrar, uno por pareja terapeuta-paciente
-- ─────────────────────────────────────────────
create table public.patient_clinical_profile (
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  full_name text,
  birth_date date,
  phone text,
  email text,
  occupation text,
  referral_source text, -- "¿cómo llegó a la consulta?" — insight para el terapeuta, no para Lemy
  address text,
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text,
  updated_at timestamptz not null default now(),
  primary key (therapist_id, patient_id)
);

alter table public.patient_clinical_profile enable row level security;
create policy "patient_clinical_profile_therapist_all" on public.patient_clinical_profile
  for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

-- ─────────────────────────────────────────────
-- Historia clínica — cifrada, un blob JSON por pareja terapeuta-paciente
-- (los ~19 campos del mockup van serializados dentro del ciphertext; ver
-- src/lib/clinical-record-crypto.ts). A diferencia de clinical_notes SÍ es
-- editable en el tiempo (no es una bitácora sesión-por-sesión, es un
-- documento vivo), así que aquí sí hay política de UPDATE para el dueño.
-- ─────────────────────────────────────────────
create table public.patient_clinical_history (
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  updated_at timestamptz not null default now(),
  primary key (therapist_id, patient_id)
);

alter table public.patient_clinical_history enable row level security;
create policy "patient_clinical_history_therapist_all" on public.patient_clinical_history
  for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

-- ─────────────────────────────────────────────
-- Notas de sesión — cifradas, inmutables tras finalizar (solo notas
-- complementarias/addenda después, nunca edición del contenido original).
-- Mismo patrón que clinical_notes (0035): SIN política de UPDATE para el
-- terapeuta — todo cambio de estado (guardar borrador, finalizar, agregar
-- addendum) pasa por server actions con el service client, que validan
-- dueño y transición de estado a mano antes de escribir.
--
-- risk_level y enfoque_familia van SIN cifrar a propósito (aunque el resto
-- del contenido sí): son solo para pintar badges/filtrar en la lista sin
-- tener que descifrar cada nota; el detalle del riesgo (tipo, acciones,
-- seguimiento) sí vive dentro del ciphertext.
-- ─────────────────────────────────────────────
create table public.session_notes (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  session_number int not null,
  status text not null default 'draft', -- draft | final
  risk_level text not null default 'ninguno', -- ninguno | a_vigilar | riesgo_alto
  enfoque_familia text, -- una de las 8 familias del catálogo de enfoques
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  deleted_at timestamptz
);

create index session_notes_therapist_patient_idx
  on public.session_notes (therapist_id, patient_id, session_number desc);

alter table public.session_notes enable row level security;
create policy "session_notes_therapist_read" on public.session_notes
  for select using (auth.uid() = therapist_id);
create policy "session_notes_therapist_insert" on public.session_notes
  for insert with check (auth.uid() = therapist_id);

-- ─────────────────────────────────────────────
-- Campos personalizados de nota — catálogo POR TERAPEUTA (una sola tabla
-- compartida, con una fila por terapeuta por campo — NO una tabla por
-- terapeuta; mismo patrón que therapist_patient_notes/0021 o cualquier otra
-- tabla de este esquema). Se ofrece de nuevo como chip en notas futuras, de
-- cualquier paciente de ese terapeuta.
-- ─────────────────────────────────────────────
create table public.session_note_custom_fields (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (therapist_id, nombre)
);

alter table public.session_note_custom_fields enable row level security;
create policy "session_note_custom_fields_therapist_all" on public.session_note_custom_fields
  for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

-- ─────────────────────────────────────────────
-- Evaluaciones — cifradas (puntaje + interpretación son datos clínicos
-- sensibles). Catálogo de instrumentos + texto libre se resuelve en la app,
-- no aquí (sin tabla de catálogo por ahora).
-- ─────────────────────────────────────────────
create table public.patient_evaluations (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  instrumento text not null,
  fecha date not null default current_date,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index patient_evaluations_therapist_patient_idx
  on public.patient_evaluations (therapist_id, patient_id, fecha desc);

alter table public.patient_evaluations enable row level security;
create policy "patient_evaluations_therapist_read" on public.patient_evaluations
  for select using (auth.uid() = therapist_id);
create policy "patient_evaluations_therapist_insert" on public.patient_evaluations
  for insert with check (auth.uid() = therapist_id);

-- ─────────────────────────────────────────────
-- Documentos y consentimientos — unificados en una tabla; `category`
-- distingue "compartido" (visible a ambos, sube cualquiera) de
-- "consentimiento" (privado del terapeuta, nunca visible al paciente, sin
-- firma electrónica — solo respaldo de un documento ya firmado en papel).
-- file_path apunta al bucket de Storage (patient-documents); si el usuario
-- solo escribió un link/comentario sin subir archivo, file_path queda null.
-- ─────────────────────────────────────────────
create table public.patient_documents (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  category text not null default 'compartido', -- compartido | consentimiento
  visible_to_patient boolean not null default true,
  file_path text,
  file_name text,
  file_size_bytes int,
  note text,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  uploaded_by_role text not null, -- 'therapist' | 'patient' — evita un join extra solo para mostrar autoría
  created_at timestamptz not null default now()
);

create index patient_documents_therapist_patient_idx
  on public.patient_documents (therapist_id, patient_id, created_at desc);

alter table public.patient_documents enable row level security;

create policy "patient_documents_therapist_all" on public.patient_documents
  for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

-- El paciente solo ve/sube documentos de categoría "compartido" — nunca
-- consentimientos, y nunca puede marcar algo como no-visible-para-sí-mismo.
create policy "patient_documents_patient_read" on public.patient_documents
  for select using (auth.uid() = patient_id and category = 'compartido' and visible_to_patient = true);
create policy "patient_documents_patient_insert" on public.patient_documents
  for insert with check (
    auth.uid() = patient_id
    and category = 'compartido'
    and visible_to_patient = true
    and uploaded_by = auth.uid()
    and uploaded_by_role = 'patient'
  );

insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false)
on conflict (id) do nothing;

-- Ruta de archivo: {therapist_id}/{patient_id}/{filename} — a diferencia del
-- bucket de verificación de terapeuta (0030, un solo dueño), aquí DOS
-- personas distintas necesitan poder leer/escribir la misma carpeta, así
-- que la política acepta cualquiera de los dos ids en la ruta. La
-- validación fina (¿este documento es realmente "compartido" y no un
-- consentimiento privado? ¿existe de verdad esta pareja terapeuta-paciente?)
-- vive en el server action que genera la ruta antes de subir, no aquí.
drop policy if exists "patient_documents_pair_read" on storage.objects;
create policy "patient_documents_pair_read" on storage.objects
  for select using (
    bucket_id = 'patient-documents'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or auth.uid()::text = (storage.foldername(name))[2]
    )
  );

drop policy if exists "patient_documents_pair_insert" on storage.objects;
create policy "patient_documents_pair_insert" on storage.objects
  for insert with check (
    bucket_id = 'patient-documents'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or auth.uid()::text = (storage.foldername(name))[2]
    )
  );

drop policy if exists "patient_documents_pair_delete" on storage.objects;
create policy "patient_documents_pair_delete" on storage.objects
  for delete using (
    bucket_id = 'patient-documents'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or auth.uid()::text = (storage.foldername(name))[2]
    )
  );

-- ─────────────────────────────────────────────
-- Vincular con paciente anterior — cuando alguien cierra su cuenta y luego
-- regresa (nueva cuenta, nuevo id), el terapeuta puede vincular el registro
-- nuevo con uno propio anterior (activo o ya cerrado/anonimizado) para ver
-- su historial previo en modo lectura, sin fusionar los datos.
-- ─────────────────────────────────────────────
create table public.patient_history_links (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade, -- registro actual
  linked_patient_id uuid not null references public.patients(id) on delete cascade, -- registro anterior
  created_at timestamptz not null default now(),
  unique (therapist_id, patient_id)
);

alter table public.patient_history_links enable row level security;
create policy "patient_history_links_therapist_all" on public.patient_history_links
  for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

-- ─────────────────────────────────────────────
-- Pago en efectivo confirmado — botón "Consulta pagada" en la ficha. Vive
-- aparte de payment_status (que para efectivo se queda en 'efectivo' desde
-- que se agenda) porque nunca antes se rastreaba si el efectivo ya se
-- cobró de verdad o sigue pendiente.
-- ─────────────────────────────────────────────
alter table public.appointments add column if not exists cash_confirmed_at timestamptz;

-- ─────────────────────────────────────────────
-- Cierre de cuenta (terapeuta y paciente) — ver 0041 para el resto del
-- mecanismo (barrido de purga a 90 días, desacoplar el cascade de
-- profiles→auth.users). Aquí solo las columnas base.
-- ─────────────────────────────────────────────
alter table public.profiles add column if not exists account_closed_at timestamptz;
alter table public.profiles add column if not exists closure_reason text;
alter table public.profiles add column if not exists how_heard_about_lemy text;

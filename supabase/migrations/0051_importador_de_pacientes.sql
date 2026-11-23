-- Importador de pacientes (AgendaPro y otros).
--
-- Modelo: cada paciente importado es una cuenta "fantasma" (sin acceso, sin
-- avisos) marcada is_imported. Su relación con el terapeuta vive en
-- therapist_patients, porque hasta ahora la lista de pacientes se deducía de
-- las citas y un paciente importado todavía no tiene ninguna.
--
-- Invitaciones: cada una queda "pending" hasta que se envía (cola con tope
-- diario, ver INVITATIONS_DAILY_CAP); nada se pierde entre un día y otro.
--
-- Idempotente: se puede correr más de una vez sin problema.

-- ── Cuenta fantasma ────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_imported boolean not null default false,
  add column if not exists imported_claimed_at timestamptz;

-- ── Datos del paciente (menores y tutor) ───────────────────────────────
alter table public.patients
  add column if not exists birth_date date,
  add column if not exists guardian_name text,
  add column if not exists guardian_phone text,
  add column if not exists guardian_email text,
  add column if not exists guardian_relationship text;

-- ── Lotes de importación ───────────────────────────────────────────────
create table if not exists public.patient_import_batches (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  filename text,
  total_rows integer not null default 0,
  imported_count integer not null default 0,
  failed_count integer not null default 0,
  authorization_accepted_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists patient_import_batches_therapist_idx
  on public.patient_import_batches (therapist_id, created_at desc);

-- ── Relación terapeuta ↔ paciente importado ────────────────────────────
create table if not exists public.therapist_patients (
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  source text not null default 'import',
  batch_id uuid references public.patient_import_batches(id) on delete set null,
  source_created_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (therapist_id, patient_id)
);
create index if not exists therapist_patients_patient_idx
  on public.therapist_patients (patient_id);

-- ── Cola de invitaciones ───────────────────────────────────────────────
create table if not exists public.patient_invitations (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (therapist_id, patient_id)
);
create index if not exists patient_invitations_status_idx
  on public.patient_invitations (status, created_at);
create index if not exists patient_invitations_sent_idx
  on public.patient_invitations (sent_at)
  where status = 'sent';

-- ── Seguridad ──────────────────────────────────────────────────────────
-- Solo el servidor (service_role) escribe. Cada terapeuta lee lo suyo.
alter table public.patient_import_batches enable row level security;
alter table public.therapist_patients enable row level security;
alter table public.patient_invitations enable row level security;

drop policy if exists patient_import_batches_own_read on public.patient_import_batches;
create policy patient_import_batches_own_read on public.patient_import_batches
  for select using (auth.uid() = therapist_id);

drop policy if exists therapist_patients_own_read on public.therapist_patients;
create policy therapist_patients_own_read on public.therapist_patients
  for select using (auth.uid() = therapist_id);

drop policy if exists patient_invitations_own_read on public.patient_invitations;
create policy patient_invitations_own_read on public.patient_invitations
  for select using (auth.uid() = therapist_id);

-- ── ¿Qué correos ya tienen cuenta en Lemy? ─────────────────────────────
-- Solo devuelve los correos que ya existen (no ids ni datos), y solo la puede
-- llamar el servidor. Sirve para no crear cuentas duplicadas al importar.
create or replace function public.lemy_existing_emails(p_emails text[])
returns table (email text)
language sql
security definer
set search_path = auth, public
as $$
  select lower(u.email)::text
  from auth.users u
  where lower(u.email) = any (select lower(x) from unnest(p_emails) as x);
$$;

revoke all on function public.lemy_existing_emails(text[]) from public, anon, authenticated;
grant execute on function public.lemy_existing_emails(text[]) to service_role;

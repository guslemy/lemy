-- Northstar — modelo de datos inicial (Fase 1 / MVP)
-- Convención: todo lo clínico queda fuera de este MVP (llega en Fase 2 con RLS reforzado)

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- Roles de usuario (perfil base, 1:1 con auth.users)
-- ─────────────────────────────────────────────
create type user_role as enum ('patient', 'therapist', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'patient',
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Catálogos coloquiales (el diferenciador)
-- nombre_tecnico = jerga clínica, nombre_coloquial = como lo lee el paciente
-- ─────────────────────────────────────────────
create table public.specialties (
  id uuid primary key default uuid_generate_v4(),
  nombre_tecnico text not null,
  nombre_coloquial text not null,
  descripcion_coloquial text,
  slug text unique not null
);

create table public.therapeutic_approaches (
  id uuid primary key default uuid_generate_v4(),
  nombre_tecnico text not null,       -- ej. "Terapia Cognitivo-Conductual"
  nombre_coloquial text not null,     -- ej. "Enfocada en cambiar hábitos de pensamiento"
  descripcion_coloquial text,
  slug text unique not null
);

-- ─────────────────────────────────────────────
-- Terapeuta
-- ─────────────────────────────────────────────
create table public.therapists (
  id uuid primary key references public.profiles(id) on delete cascade,
  slug text unique not null,
  display_name text not null,
  gender text,
  city text default 'Oaxaca',
  zona text,
  photo_url text,
  tagline text,                 -- frase corta coloquial
  bio text,                     -- "quién soy" en lenguaje coloquial
  languages text[] default array['Español'],
  client_niches text[],         -- ej. {"adolescentes","parejas","ansiedad"}
  is_online_available boolean not null default true,
  price_min numeric(10,2),
  price_max numeric(10,2),
  verification_status text not null default 'pending', -- pending | verified | rejected
  verified_at timestamptz,
  stripe_connect_account_id text,
  stripe_billing_customer_id text,
  stripe_billing_subscription_id text,
  subscription_status text default 'inactive', -- inactive | active | past_due | canceled
  subscription_plan text,                      -- ej. base | plus
  google_calendar_connected boolean not null default false,
  is_published boolean not null default false, -- perfil visible en buscador solo si true
  created_at timestamptz not null default now()
);

create table public.therapist_specialties (
  therapist_id uuid references public.therapists(id) on delete cascade,
  specialty_id uuid references public.specialties(id) on delete cascade,
  primary key (therapist_id, specialty_id)
);

create table public.therapist_approaches (
  therapist_id uuid references public.therapists(id) on delete cascade,
  approach_id uuid references public.therapeutic_approaches(id) on delete cascade,
  primary key (therapist_id, approach_id)
);

-- Credenciales (cédula, títulos, másters) — sello de confianza
create table public.therapist_credentials (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  tipo text not null,          -- 'cedula' | 'licenciatura' | 'maestria' | 'diplomado' | 'otro'
  institucion text,
  titulo text,
  anio int,
  documento_url text,          -- archivo subido a Supabase Storage (privado)
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Paciente
-- ─────────────────────────────────────────────
create table public.patients (
  id uuid primary key references public.profiles(id) on delete cascade,
  city text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Disponibilidad (agenda propia del terapeuta)
-- ─────────────────────────────────────────────
create table public.availability_slots (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  day_of_week int,             -- 0=domingo … 6=sábado (para reglas recurrentes)
  start_time time,
  end_time time,
  specific_date date,          -- si no es recurrente, fecha puntual
  is_recurring boolean not null default true,
  is_blocked boolean not null default false, -- bloqueo manual (vacaciones, etc.)
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Cita
-- ─────────────────────────────────────────────
create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id),
  patient_id uuid not null references public.patients(id),
  scheduled_at timestamptz not null,
  duration_min int not null default 50,
  modality text not null default 'online', -- online | presencial
  status text not null default 'pending_payment', -- pending_payment | confirmed | completed | cancelled | no_show
  price numeric(10,2) not null,
  payment_status text not null default 'pending', -- pending | paid | refunded
  stripe_payment_intent_id text,
  google_calendar_event_id text,   -- id del evento creado en ambos calendarios
  meeting_link text,               -- URL de Google Meet autogenerada
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Reseña (solo tras cita completada)
-- ─────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id),
  patient_id uuid not null references public.patients(id),
  appointment_id uuid not null references public.appointments(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (appointment_id) -- una reseña por cita
);

-- ─────────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.therapists enable row level security;
alter table public.therapist_credentials enable row level security;
alter table public.patients enable row level security;
alter table public.availability_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.reviews enable row level security;

-- profiles: cada quien ve/edita el suyo
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- therapists: perfil público de lectura si is_published; el dueño siempre puede ver/editar el suyo
create policy "therapists_public_read" on public.therapists for select using (is_published = true or auth.uid() = id);
create policy "therapists_update_own" on public.therapists for update using (auth.uid() = id);
create policy "therapists_insert_own" on public.therapists for insert with check (auth.uid() = id);

-- credenciales: privadas, solo el propio terapeuta (verificación la hace un admin con service role)
create policy "credentials_owner_only" on public.therapist_credentials for all using (auth.uid() = therapist_id);

-- patients: cada quien ve/edita el suyo
create policy "patients_owner_only" on public.patients for all using (auth.uid() = id);

-- availability: público puede leer (para el buscador/agenda), solo el dueño escribe
create policy "availability_public_read" on public.availability_slots for select using (true);
create policy "availability_owner_write" on public.availability_slots for insert with check (auth.uid() = therapist_id);
create policy "availability_owner_update" on public.availability_slots for update using (auth.uid() = therapist_id);
create policy "availability_owner_delete" on public.availability_slots for delete using (auth.uid() = therapist_id);

-- appointments: solo el terapeuta y el paciente involucrados
create policy "appointments_participants_read" on public.appointments for select using (auth.uid() = therapist_id or auth.uid() = patient_id);
create policy "appointments_patient_insert" on public.appointments for insert with check (auth.uid() = patient_id);
create policy "appointments_participants_update" on public.appointments for update using (auth.uid() = therapist_id or auth.uid() = patient_id);

-- reviews: lectura pública si publicada; solo el paciente de la cita puede crearla
create policy "reviews_public_read" on public.reviews for select using (is_published = true);
create policy "reviews_patient_insert" on public.reviews for insert with check (auth.uid() = patient_id);

-- specialties / approaches: catálogo de lectura pública (sin RLS restrictivo, solo lectura vía anon)
alter table public.specialties enable row level security;
alter table public.therapeutic_approaches enable row level security;
create policy "specialties_public_read" on public.specialties for select using (true);
create policy "approaches_public_read" on public.therapeutic_approaches for select using (true);

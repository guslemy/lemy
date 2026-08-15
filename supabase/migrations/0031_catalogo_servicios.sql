-- Catálogo de servicios con precio propio por terapeuta (Notion: "Precios
-- por servicio en el perfil del terapeuta"). Decisiones de diseño (2026-08-14):
-- 1. Catálogo fijo predefinido — el terapeuta NO escribe texto libre, solo
--    elige de esta lista y le pone precio + duración.
-- 2. therapists.price_min/price_max se quedan igual, como el rango que se ve
--    en la tarjeta del buscador antes de entrar al perfil — no se tocan.
-- 3. La duración de cada servicio se limita a 3 opciones fijas (30/45/60
--    min) para no complicar la lógica de disponibilidad (ver
--    src/lib/availability.ts, que pasa de comparar por coincidencia exacta a
--    comparar por traslape de rango en este mismo cambio).

-- ─────────────────────────────────────────────
-- Catálogo fijo de servicios
-- ─────────────────────────────────────────────
create table if not exists public.service_catalog (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  nombre text not null,
  descripcion text,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.service_catalog enable row level security;

drop policy if exists "service_catalog_public_read" on public.service_catalog;
create policy "service_catalog_public_read" on public.service_catalog
  for select using (true);

insert into public.service_catalog (slug, nombre, descripcion, orden) values
  ('primera-sesion', 'Primera sesión / Consulta inicial', 'La primera vez que se conocen: platican qué te trae a terapia y arman juntos un plan de trabajo.', 1),
  ('sesion-individual', 'Sesión individual', 'Consulta de seguimiento uno a uno, el formato más común de terapia.', 2),
  ('sesion-pareja', 'Sesión de pareja', 'Terapia enfocada en la relación, con ambas personas presentes.', 3),
  ('sesion-familiar', 'Sesión familiar', 'Terapia con varios integrantes de la familia en la misma sesión.', 4),
  ('sesion-infantil', 'Sesión infantil', 'Consulta pensada para niñas y niños, adaptada a su edad.', 5),
  ('sesion-adolescentes', 'Sesión con adolescentes', 'Consulta pensada para adolescentes.', 6),
  ('sesion-seguimiento', 'Sesión de seguimiento / consecutiva', 'Consultas posteriores a la primera sesión, para dar continuidad al proceso.', 7),
  ('evaluacion-psicopedagogica', 'Evaluación psicopedagógica', 'Valoración enfocada en el aprendizaje y el desempeño escolar.', 8),
  ('evaluacion-psicometrica', 'Evaluación psicométrica', 'Aplicación de pruebas estandarizadas para evaluar aspectos específicos (cognitivos, de personalidad, etc.).', 9),
  ('sesion-en-linea', 'Sesión en línea', 'Consulta realizada por videollamada.', 10)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────
-- Qué servicios ofrece cada terapeuta, con su propio precio y duración
-- ─────────────────────────────────────────────
create table if not exists public.therapist_services (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  service_id uuid not null references public.service_catalog(id) on delete cascade,
  price numeric(10,2) not null check (price > 0),
  duration_min int not null check (duration_min in (30, 45, 60)),
  created_at timestamptz not null default now(),
  unique (therapist_id, service_id)
);

alter table public.therapist_services enable row level security;

-- Lectura pública (igual que therapist_specialties/therapist_approaches) —
-- el perfil público necesita mostrar esto sin que el visitante tenga sesión.
drop policy if exists "therapist_services_public_read" on public.therapist_services;
create policy "therapist_services_public_read" on public.therapist_services
  for select using (true);

drop policy if exists "therapist_services_owner_write" on public.therapist_services;
create policy "therapist_services_owner_write" on public.therapist_services
  for all using (auth.uid() = therapist_id) with check (auth.uid() = therapist_id);

-- ─────────────────────────────────────────────
-- Qué servicio (si alguno) se reservó en cada cita — nullable a propósito:
-- las citas de antes de este cambio, y los terapeutas que todavía no
-- configuran su catálogo (siguen con el flujo viejo de price_min/
-- session_duration_min), no tienen ninguno. on delete set null porque si el
-- terapeuta deja de ofrecer ese servicio después, la cita ya agendada no
-- debe romperse ni perder su registro — price/duration_min de appointments
-- ya quedan guardados aparte como snapshot de todos modos.
-- ─────────────────────────────────────────────
alter table public.appointments
  add column if not exists therapist_service_id uuid references public.therapist_services(id) on delete set null;

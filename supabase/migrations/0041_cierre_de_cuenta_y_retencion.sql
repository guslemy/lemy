-- Cierre de cuenta (terapeuta y paciente) — decisiones confirmadas por
-- Gustavo el 2026-09-22:
--
-- TERAPEUTA: soft-close con retención de 90 días (mismo plazo que usa
-- growth para intentar recuperarlo) — se le avisa que exporte su expediente
-- porque "no se guardará por motivos de seguridad" (no se le dice que sí
-- hay respaldo interno), pero de verdad se purga hasta el día 90 vía un
-- paso nuevo en el cron de notificaciones (ver src/lib/notifications/engine.ts).
--
-- PACIENTE: cierre inmediato del LOGIN, pero NO de la fila histórica — no es
-- posible borrar patients/profiles de verdad mientras existan reviews o
-- appointments apuntando a esa fila (esas tablas no tienen "on delete
-- cascade" hacia patients, a propósito, para no perder ese historial). En
-- vez de eso: se anonimiza el nombre/teléfono/avatar del perfil (el nombre
-- "de verdad" que el terapeuta capturó en patient_clinical_profile.full_name
-- NO se toca — es su propio expediente, no la cuenta del paciente, y es
-- justo lo que la NOM-004-SSA3-2012 lo obliga a conservar 5 años), se marca
-- account_closed_at, y se elimina de verdad solo la credencial de acceso
-- (auth.users) — nunca más se puede iniciar sesión con esa cuenta.
--
-- Para que borrar auth.users no arrastre en cascada profiles (y con eso
-- patients, therapist_patient_notes, session_notes, etc. — justo el
-- expediente que el terapeuta necesita conservar), se quita el "on delete
-- cascade" original de profiles→auth.users. A partir de aquí, borrar un
-- usuario de Supabase Auth deja la fila de profiles huérfana a propósito
-- (sin usuario de Auth correspondiente, así que nunca más puede loguearse:
-- ninguna sesión puede tener ese auth.uid()) — el borrado de la fila
-- profiles/patients/therapists en sí NUNCA ocurre automáticamente.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete no action;

-- ─────────────────────────────────────────────
-- Aviso de inactividad — "este paciente no te ha visitado en 1 mes" (con
-- recordatorio de descargar el expediente por la NOM). Se dispara una sola
-- vez por pareja terapeuta-paciente mientras dure la inactividad; si vuelve
-- a haber una cita y luego otra vez pasa un mes, se vuelve a disparar (el
-- barrido borra la marca cuando detecta una cita más reciente que
-- notified_at, ver engine.ts).
-- ─────────────────────────────────────────────
create table public.therapist_patient_dormancy_notices (
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  notified_at timestamptz not null default now(),
  primary key (therapist_id, patient_id)
);

alter table public.therapist_patient_dormancy_notices enable row level security;
create policy "dormancy_notices_therapist_read" on public.therapist_patient_dormancy_notices
  for select using (auth.uid() = therapist_id);
-- Sin política de insert/update/delete para el terapeuta: el barrido
-- automático usa el service client (bypassa RLS) a propósito, esto no es
-- algo que el terapeuta dispare ni pueda manipular a mano.

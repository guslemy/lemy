-- Anticipación mínima de reserva: cuánto tiempo antes tiene que agendarse
-- una cita con este terapeuta (ej. "al menos 2 días antes"). Tope de 1 año
-- validado en la app, no aquí (para poder dar un mensaje de error claro).
alter table public.therapists
  add column if not exists booking_lead_amount int not null default 1,
  add column if not exists booking_lead_unit text not null default 'dias'
    check (booking_lead_unit in ('dias', 'semanas', 'meses'));

-- Bloqueos manuales de agenda: vacaciones, una comida familiar, un día que
-- el terapeuta quiere descansar. Independientes de los bloques recurrentes
-- semanales (availability_slots) — esto es "quita este rango puntual".
create table if not exists public.therapist_blocked_slots (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.therapist_blocked_slots enable row level security;

-- Lectura pública necesaria: el cálculo de horarios disponibles en el
-- perfil público (que puede verlo cualquier visitante anónimo) tiene que
-- poder excluir estos rangos.
create policy "blocked_slots_public_read" on public.therapist_blocked_slots for select using (true);
create policy "blocked_slots_owner_insert" on public.therapist_blocked_slots for insert with check (auth.uid() = therapist_id);
create policy "blocked_slots_owner_delete" on public.therapist_blocked_slots for delete using (auth.uid() = therapist_id);

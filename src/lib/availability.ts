import type { SupabaseClient } from "@supabase/supabase-js";

// Calcula horarios reales disponibles para reservar, a partir de los
// bloques recurrentes semanales del terapeuta (availability_slots),
// partidos en sesiones de 50 min, excluyendo lo que ya está agendado.
//
// Nota sobre zona horaria: Oaxaca usa siempre UTC-6 (México adoptó horario
// estándar permanente desde 2022, sin horario de verano). Por eso el offset
// está fijo en vez de usar una librería de zonas horarias — si Lemy alguna
// vez opera en otra región, esto hay que revisarlo.

export type AvailableSlot = {
  date: string; // YYYY-MM-DD (fecha local Oaxaca)
  startTime: string; // HH:MM local
  scheduledAtUtc: string; // ISO UTC — lo que se guarda en appointments.scheduled_at
};

const SESSION_DURATION_MIN = 50;
const DAYS_AHEAD = 14;
const OAXACA_UTC_OFFSET_MIN = 6 * 60;

type RawWeeklySlot = { day_of_week: number; start_time: string; end_time: string };

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function oaxacaNowAsUtcFields(): Date {
  // Un Date cuyos campos UTC representan la hora local actual en Oaxaca
  // (truco de conversión, no es un instante real).
  return new Date(Date.now() - OAXACA_UTC_OFFSET_MIN * 60 * 1000);
}

function localFieldsToUtcInstant(y: number, mo: number, d: number, hh: number, mm: number): Date {
  return new Date(Date.UTC(y, mo, d, hh, mm, 0, 0) + OAXACA_UTC_OFFSET_MIN * 60 * 1000);
}

// Convierte la anticipación mínima que definió el terapeuta ("2 días",
// "1 semana", "3 meses") a minutos, para poder compararla contra la hora
// actual. Los meses se tratan como 30 días — no necesitamos precisión de
// calendario aquí, solo un mínimo razonable.
function leadTimeMinutes(amount: number, unit: string): number {
  const perUnitMinutes = unit === "semanas" ? 7 * 24 * 60 : unit === "meses" ? 30 * 24 * 60 : 24 * 60;
  return Math.max(0, amount) * perUnitMinutes;
}

export async function getAvailableSlots(
  supabase: SupabaseClient,
  therapistId: string
): Promise<AvailableSlot[]> {
  const rangeStart = new Date();
  const rangeEnd = new Date(Date.now() + (DAYS_AHEAD + 1) * 24 * 60 * 60 * 1000);

  const [{ data: rawWeekly }, { data: therapistRow }, { data: rawBooked }, { data: rawBlocked }] =
    await Promise.all([
      supabase
        .from("availability_slots")
        .select("day_of_week, start_time, end_time")
        .eq("therapist_id", therapistId)
        .eq("is_recurring", true)
        .eq("is_blocked", false),
      supabase
        .from("therapists")
        .select("booking_lead_amount, booking_lead_unit")
        .eq("id", therapistId)
        .maybeSingle(),
      supabase
        .from("appointments")
        .select("scheduled_at")
        .eq("therapist_id", therapistId)
        .neq("status", "cancelled")
        .gte("scheduled_at", rangeStart.toISOString())
        .lte("scheduled_at", rangeEnd.toISOString()),
      supabase
        .from("therapist_blocked_slots")
        .select("start_at, end_at")
        .eq("therapist_id", therapistId)
        .lte("start_at", rangeEnd.toISOString())
        .gte("end_at", rangeStart.toISOString()),
    ]);

  const weekly = (rawWeekly ?? []) as RawWeeklySlot[];
  if (!weekly.length) return [];

  const oaxacaNow = oaxacaNowAsUtcFields();

  const bookedSet = new Set((rawBooked ?? []).map((a) => new Date(a.scheduled_at as string).toISOString()));

  const earliestBookableMs =
    Date.now() +
    leadTimeMinutes(
      (therapistRow?.booking_lead_amount as number | undefined) ?? 1,
      (therapistRow?.booking_lead_unit as string | undefined) ?? "dias"
    ) *
      60 *
      1000;

  const blockedRanges = ((rawBlocked ?? []) as { start_at: string; end_at: string }[]).map((b) => ({
    startMs: new Date(b.start_at).getTime(),
    endMs: new Date(b.end_at).getTime(),
  }));

  const slots: AvailableSlot[] = [];

  for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
    const localDay = new Date(oaxacaNow.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dow = localDay.getUTCDay();
    const y = localDay.getUTCFullYear();
    const mo = localDay.getUTCMonth();
    const d = localDay.getUTCDate();

    const daySlots = weekly.filter((w) => w.day_of_week === dow);
    for (const w of daySlots) {
      const startMin = toMinutes(w.start_time);
      const endMin = toMinutes(w.end_time);
      for (let m = startMin; m + SESSION_DURATION_MIN <= endMin; m += SESSION_DURATION_MIN) {
        const hh = Math.floor(m / 60);
        const mm = m % 60;
        const scheduledAtUtc = localFieldsToUtcInstant(y, mo, d, hh, mm);
        const slotStartMs = scheduledAtUtc.getTime();
        if (slotStartMs < earliestBookableMs) continue;

        const iso = scheduledAtUtc.toISOString();
        if (bookedSet.has(iso)) continue;

        const slotEndMs = slotStartMs + SESSION_DURATION_MIN * 60 * 1000;
        const isBlocked = blockedRanges.some((b) => slotStartMs < b.endMs && slotEndMs > b.startMs);
        if (isBlocked) continue;

        slots.push({
          date: `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          startTime: minutesToHHMM(m),
          scheduledAtUtc: iso,
        });
      }
    }
  }

  return slots;
}

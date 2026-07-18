"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireTherapist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "therapist") redirect("/dashboard");

  return { supabase, user };
}

export async function addAvailabilitySlot(formData: FormData) {
  const { supabase, user } = await requireTherapist();

  const day_of_week = Number(formData.get("day_of_week"));
  const start_time = String(formData.get("start_time") || "");
  const end_time = String(formData.get("end_time") || "");

  if (
    Number.isNaN(day_of_week) ||
    day_of_week < 0 ||
    day_of_week > 6 ||
    !start_time ||
    !end_time ||
    start_time >= end_time
  ) {
    redirect("/dashboard/disponibilidad?error=1");
  }

  await supabase.from("availability_slots").insert({
    therapist_id: user.id,
    day_of_week,
    start_time,
    end_time,
    is_recurring: true,
  });

  revalidatePath("/dashboard/disponibilidad");
  redirect("/dashboard/disponibilidad?guardado=1");
}

export async function deleteAvailabilitySlot(formData: FormData) {
  const { supabase, user } = await requireTherapist();

  const id = String(formData.get("id") || "");
  if (id) {
    await supabase.from("availability_slots").delete().eq("id", id).eq("therapist_id", user.id);
  }

  revalidatePath("/dashboard/disponibilidad");
  redirect("/dashboard/disponibilidad?eliminado=1");
}

const MAX_LEAD_DAYS = 365;
const OAXACA_UTC_OFFSET_MIN = 6 * 60;

function leadDays(amount: number, unit: string) {
  const perUnit = unit === "semanas" ? 7 : unit === "meses" ? 30 : 1;
  return amount * perUnit;
}

// Los inputs datetime-local mandan la hora tal cual se ve en pantalla, sin
// zona horaria (ej. "2026-08-01T16:00") — le sumamos el offset fijo de
// Oaxaca para guardar el instante UTC correcto, mismo truco que en
// src/lib/availability.ts.
function oaxacaLocalStringToUtcIso(raw: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(raw);
  if (!match) return null;
  const [, y, mo, d, hh, mm] = match;
  const utcMs =
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), 0, 0) +
    OAXACA_UTC_OFFSET_MIN * 60 * 1000;
  return new Date(utcMs).toISOString();
}

// El terapeuta define cuánto tiempo antes tiene que agendarse una cita con
// él/ella (ej. "al menos 2 días antes"). Tope de 1 año para evitar valores
// absurdos que dejarían la agenda vacía sin explicación.
export async function updateBookingLead(formData: FormData) {
  const { supabase, user } = await requireTherapist();

  const amount = Number(formData.get("booking_lead_amount"));
  const unit = String(formData.get("booking_lead_unit") || "dias");

  if (
    Number.isNaN(amount) ||
    amount < 1 ||
    amount > 30 ||
    !["dias", "semanas", "meses"].includes(unit) ||
    leadDays(amount, unit) > MAX_LEAD_DAYS
  ) {
    redirect("/dashboard/disponibilidad?error=anticipacion");
  }

  await supabase
    .from("therapists")
    .update({ booking_lead_amount: amount, booking_lead_unit: unit })
    .eq("id", user.id);

  revalidatePath("/dashboard/disponibilidad");
  revalidatePath("/terapeuta");
  redirect("/dashboard/disponibilidad?guardado_anticipacion=1");
}

// Bloqueos puntuales: vacaciones, una comida familiar, un jueves libre.
// Independientes de los bloques recurrentes semanales.
export async function addBlockedSlot(formData: FormData) {
  const { supabase, user } = await requireTherapist();

  const start_at = oaxacaLocalStringToUtcIso(String(formData.get("start_at") || ""));
  const end_at = oaxacaLocalStringToUtcIso(String(formData.get("end_at") || ""));
  const reason = String(formData.get("reason") || "").trim() || null;

  if (!start_at || !end_at || new Date(start_at).getTime() >= new Date(end_at).getTime()) {
    redirect("/dashboard/disponibilidad?error=bloqueo");
  }

  await supabase.from("therapist_blocked_slots").insert({
    therapist_id: user.id,
    start_at,
    end_at,
    reason,
  });

  revalidatePath("/dashboard/disponibilidad");
  redirect("/dashboard/disponibilidad?bloqueado=1");
}

export async function deleteBlockedSlot(formData: FormData) {
  const { supabase, user } = await requireTherapist();

  const id = String(formData.get("id") || "");
  if (id) {
    await supabase.from("therapist_blocked_slots").delete().eq("id", id).eq("therapist_id", user.id);
  }

  revalidatePath("/dashboard/disponibilidad");
  redirect("/dashboard/disponibilidad?desbloqueado=1");
}

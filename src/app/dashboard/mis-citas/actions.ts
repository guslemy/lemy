"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cancelAppointmentAsParticipant } from "@/lib/appointments";
import { notifyAppointmentCancelled } from "@/lib/notifications/instant";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Se guarda aquí (no en el flujo de reserva de un clic) para no meterle
// fricción a agendar — el paciente lo llena la primera vez que entra a ver
// sus citas, y con eso ya le llegan los recordatorios por WhatsApp.
export async function updatePatientPhone(formData: FormData) {
  const { supabase, user } = await requireUser();
  const phone = String(formData.get("phone") || "").trim() || null;

  await supabase.from("profiles").update({ phone }).eq("id", user.id);

  revalidatePath("/dashboard/mis-citas");
  redirect("/dashboard/mis-citas?telefono_guardado=1");
}

export async function cancelAppointmentPatient(formData: FormData) {
  const { supabase, user } = await requireUser();
  const appointmentId = String(formData.get("appointment_id") || "");
  const reason = String(formData.get("reason") || "").trim() || null;

  const result = await cancelAppointmentAsParticipant(
    supabase,
    user.id,
    appointmentId,
    "patient",
    reason
  );

  if (result.ok && result.appointment) {
    await notifyAppointmentCancelled({
      appointmentId,
      cancelledBy: "patient",
      therapistId: result.appointment.therapist_id,
      patientId: result.appointment.patient_id,
      scheduledAtIso: result.appointment.scheduled_at,
    });
  }

  revalidatePath("/dashboard/mis-citas");
  redirect(result.ok ? "/dashboard/mis-citas?cancelado=1" : "/dashboard/mis-citas?error=1");
}

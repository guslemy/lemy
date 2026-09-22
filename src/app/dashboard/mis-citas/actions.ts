"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cancelAppointmentAsParticipant } from "@/lib/appointments";
import { notifyAppointmentCancelled, notifyAppointmentAccepted } from "@/lib/notifications/instant";
import { startAppointmentCheckout } from "@/lib/appointment-checkout";
import { hasGestionaPlan } from "@/lib/plan-features";

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

  revalidatePath("/dashboard");
  redirect("/dashboard?tab=citas&telefono_guardado=1");
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

  revalidatePath("/dashboard");
  redirect(result.ok ? "/dashboard?tab=citas&cancelado=1" : "/dashboard?tab=citas&error=1");
}

// El paciente acepta una cita que su terapeuta agendó directo desde la
// ficha (status "pending_patient_acceptance", 24 horas de plazo — ver
// createAppointmentForPatient en dashboard/citas/actions.ts). Mismo
// criterio de cardAvailable que requestAppointmentForUser (lib/appointments.ts):
// si el terapeuta de verdad puede cobrar con tarjeta a través de Lemy, se
// manda a Stripe Checkout igual que cualquier otra reserva con tarjeta; si
// no, la cita pasa a "pending_payment"/"efectivo" (mismo estado al que
// llega una solicitud normal en efectivo) y solo le falta al terapeuta
// confirmarla con un clic, como con cualquier otra solicitud pendiente.
export async function acceptTherapistAppointment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const appointmentId = String(formData.get("appointment_id") || "");
  if (!appointmentId) redirect("/dashboard?tab=citas&error=1");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, therapist_id, scheduled_at, patient_acceptance_expires_at")
    .eq("id", appointmentId)
    .eq("patient_id", user.id)
    .eq("status", "pending_patient_acceptance")
    .maybeSingle();

  if (!appointment) redirect("/dashboard?tab=citas&error=1");

  const expiresAt = appointment.patient_acceptance_expires_at as string | null;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    // Ya venció — el barrido del cron todavía no alcanza a cancelarla, pero
    // no tiene caso dejar que el paciente la acepte de todos modos.
    redirect("/dashboard?tab=citas&error=1");
  }

  const { data: therapist } = await supabase
    .from("therapists")
    .select(
      "accepts_card_payment, stripe_connect_account_id, stripe_connect_charges_enabled, subscription_plan, subscription_status"
    )
    .eq("id", appointment.therapist_id as string)
    .maybeSingle();

  const cardAvailable = Boolean(
    therapist?.accepts_card_payment &&
      therapist?.stripe_connect_account_id &&
      therapist?.stripe_connect_charges_enabled &&
      hasGestionaPlan(
        therapist?.subscription_plan as string | null,
        therapist?.subscription_status as string | null
      )
  );

  if (cardAvailable) {
    // El vencimiento de ACEPTACIÓN (patient_acceptance_expires_at) ya no
    // aplica en cuanto el paciente acepta. No se pone ningún
    // therapist_confirmation_expires_at aquí — un pago con tarjeta no
    // completado tiene su propio plazo, mucho más corto (5 min de
    // recordatorio, 20 min para liberar el horario, calculado directo desde
    // appointments.created_at — ver runNotificationSweep en engine.ts), y un
    // pago que SÍ se completa se confirma solo sin pasar por ningún plazo.
    await supabase
      .from("appointments")
      .update({ status: "pending_payment", patient_acceptance_expires_at: null })
      .eq("id", appointmentId)
      .eq("patient_id", user.id);

    const checkoutUrl = await startAppointmentCheckout(appointmentId);
    if (!checkoutUrl) redirect("/dashboard?tab=citas&error=1");
    redirect(checkoutUrl);
  }

  // A petición de Gustavo (2026-09-21): 24 horas de plazo para que el
  // terapeuta confirme — esto sí aplica aquí porque esta rama es en
  // efectivo (sin pago real de por medio, así que no hay checkout que
  // pueda "no completarse").
  const therapistConfirmationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "pending_payment",
      payment_status: "efectivo",
      patient_acceptance_expires_at: null,
      therapist_confirmation_expires_at: therapistConfirmationExpiresAt,
    })
    .eq("id", appointmentId)
    .eq("patient_id", user.id);

  if (error) redirect("/dashboard?tab=citas&error=1");

  await notifyAppointmentAccepted({
    appointmentId,
    therapistId: appointment.therapist_id as string,
    patientId: user.id,
    scheduledAtIso: appointment.scheduled_at as string,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?tab=citas&aceptado=1");
}

// El paciente rechaza una cita que su terapeuta agendó directo — mismo
// camino que cancelar cualquier otra cita propia (cancelAppointmentAsParticipant
// ya cubre "solo puede tocarla quien es de verdad uno de los dos
// participantes" y "no se puede tocar algo ya cancelado/completado").
export async function declineTherapistAppointment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const appointmentId = String(formData.get("appointment_id") || "");
  const reason = String(formData.get("reason") || "").trim() || null;

  const result = await cancelAppointmentAsParticipant(supabase, user.id, appointmentId, "patient", reason);

  if (result.ok && result.appointment) {
    await notifyAppointmentCancelled({
      appointmentId,
      cancelledBy: "patient",
      therapistId: result.appointment.therapist_id,
      patientId: result.appointment.patient_id,
      scheduledAtIso: result.appointment.scheduled_at,
    });
  }

  revalidatePath("/dashboard");
  redirect(result.ok ? "/dashboard?tab=citas&rechazado=1" : "/dashboard?tab=citas&error=1");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAccessToken, createCalendarEvent, GoogleCalendarError } from "@/lib/google-calendar";
import { cancelAppointmentAsParticipant } from "@/lib/appointments";

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

// El terapeuta confirma una cita solicitada: crea el evento real en su Google
// Calendar (con Meet autogenerado, invitando al paciente) y recién entonces
// la cita pasa a "confirmed". Si algo falla del lado de Google, la cita se
// queda como estaba — no marcamos nada como confirmado sin evento real.
export async function confirmAppointment(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const appointmentId = String(formData.get("appointment_id") || "");
  if (!appointmentId) redirect("/dashboard/citas?error=1");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, therapist_id, patient_id, scheduled_at, duration_min, status")
    .eq("id", appointmentId)
    .eq("therapist_id", user.id)
    .maybeSingle();

  if (!appointment) redirect("/dashboard/citas?error=1");
  if (appointment.status !== "pending_payment") {
    redirect("/dashboard/citas?error=1");
  }

  const { data: therapist } = await supabase
    .from("therapists")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const serviceClient = createServiceClient();

  const { data: refreshToken } = await serviceClient.rpc("get_google_refresh_token", {
    p_user_id: user.id,
  });

  if (!refreshToken) {
    redirect("/dashboard/citas?sin_calendario=1");
  }

  const { data: patientAuth } = await serviceClient.auth.admin.getUserById(appointment.patient_id);
  const patientEmail = patientAuth?.user?.email;
  const therapistEmail = user.email;

  if (!patientEmail || !therapistEmail) {
    redirect("/dashboard/citas?error=1");
  }

  const { data: patientProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", appointment.patient_id)
    .maybeSingle();

  const startIso = new Date(appointment.scheduled_at).toISOString();
  const endIso = new Date(
    new Date(appointment.scheduled_at).getTime() + appointment.duration_min * 60 * 1000
  ).toISOString();

  const therapistName = therapist?.display_name ?? "tu terapeuta";
  const patientName = patientProfile?.full_name ?? "tu paciente";

  try {
    const accessToken = await getAccessToken(refreshToken);
    const { eventId, meetingLink } = await createCalendarEvent({
      accessToken,
      summary: `Sesión Lemy — ${therapistName} y ${patientName}`,
      description: "Sesión agendada a través de Lemy.",
      startIso,
      endIso,
      therapistEmail,
      patientEmail,
    });

    await supabase
      .from("appointments")
      .update({
        status: "confirmed",
        google_calendar_event_id: eventId,
        meeting_link: meetingLink,
      })
      .eq("id", appointmentId)
      .eq("therapist_id", user.id);
  } catch (err) {
    console.error("Error confirmando cita / creando evento en Calendar:", err);
    const reason = err instanceof GoogleCalendarError ? "google" : "1";
    redirect(`/dashboard/citas?error=${reason}`);
  }

  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
  redirect("/dashboard/citas?confirmado=1");
}

// El terapeuta cancela una cita propia (pendiente o ya confirmada). No borra
// el evento de Calendar automáticamente todavía — eso queda para cuando
// conectemos las notificaciones, por ahora solo se refleja en Lemy.
export async function cancelAppointmentTherapist(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const appointmentId = String(formData.get("appointment_id") || "");
  const reason = String(formData.get("reason") || "").trim() || null;

  const result = await cancelAppointmentAsParticipant(
    supabase,
    user.id,
    appointmentId,
    "therapist",
    reason
  );

  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
  redirect(result.ok ? "/dashboard/citas?cancelado=1" : "/dashboard/citas?error=1");
}

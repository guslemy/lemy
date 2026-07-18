"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensurePatientShell } from "@/lib/supabase/ensure-patient";
import { notifyAppointmentRequested } from "@/lib/notifications/instant";

// Solicitud de reserva por parte del paciente. Por ahora queda en
// "pending_payment" y el terapeuta la confirma a mano (Etapa D) — cuando
// conectemos Stripe, el pago disparará la misma confirmación automáticamente.
export async function requestAppointment(formData: FormData) {
  const therapistSlug = String(formData.get("therapist_slug") || "");
  const scheduledAt = String(formData.get("scheduled_at") || "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/terapeuta/${therapistSlug}`);
  }

  if (!therapistSlug || !scheduledAt) {
    redirect(`/terapeuta/${therapistSlug}?error=1`);
  }

  await ensurePatientShell(supabase, user.id);

  const { data: therapist } = await supabase
    .from("therapists")
    .select("id, price_min, price_max")
    .eq("slug", therapistSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (!therapist) {
    redirect(`/terapeuta/${therapistSlug}?error=1`);
  }

  // Revalidar que el horario sigue libre (por si alguien más lo tomó justo antes)
  const { data: clash } = await supabase
    .from("appointments")
    .select("id")
    .eq("therapist_id", therapist.id)
    .eq("scheduled_at", scheduledAt)
    .neq("status", "cancelled")
    .maybeSingle();

  if (clash) {
    redirect(`/terapeuta/${therapistSlug}?ocupado=1`);
  }

  const price = therapist.price_min ?? therapist.price_max ?? 0;

  const { data: inserted } = await supabase
    .from("appointments")
    .insert({
      therapist_id: therapist.id,
      patient_id: user.id,
      scheduled_at: scheduledAt,
      duration_min: 50,
      modality: "online",
      status: "pending_payment",
      payment_status: "pending",
      price,
    })
    .select("id")
    .single();

  if (inserted?.id) {
    // No debe bloquear la reserva si falla — se atrapa internamente.
    await notifyAppointmentRequested({
      appointmentId: inserted.id,
      therapistId: therapist.id,
      patientId: user.id,
      scheduledAtIso: scheduledAt,
    });
  }

  revalidatePath(`/terapeuta/${therapistSlug}`);
  revalidatePath("/dashboard");
  redirect(`/terapeuta/${therapistSlug}?solicitado=1`);
}

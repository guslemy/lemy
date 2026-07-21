"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensurePatientShell } from "@/lib/supabase/ensure-patient";
import { requestAppointmentForUser } from "@/lib/appointments";
import { hasCompleteProfile } from "@/lib/supabase/profile-completeness";

// Solicitud de reserva por parte del paciente. Por ahora queda en
// "pending_payment" y el terapeuta la confirma a mano (Etapa D) — cuando
// conectemos Stripe, el pago disparará la misma confirmación automáticamente.
export async function requestAppointment(formData: FormData) {
  const therapistSlug = String(formData.get("therapist_slug") || "");
  const scheduledAt = String(formData.get("scheduled_at") || "");
  const modality = formData.get("modality") === "presencial" ? "presencial" : "online";

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

  // Antes de reservar necesitamos nombre y teléfono del paciente (para poder
  // contactarlo sobre su cita y, más adelante, ligar su método de pago). Si
  // falta algo, lo mandamos a completar su perfil y de ahí retoma esta misma
  // reserva (incluida la modalidad elegida) sin perder nada.
  const complete = await hasCompleteProfile(supabase, user.id);
  if (!complete) {
    const params = new URLSearchParams({
      next_slug: therapistSlug,
      next_scheduled_at: scheduledAt,
      next_modality: modality,
    });
    redirect(`/completar-perfil?${params.toString()}`);
  }

  await ensurePatientShell(supabase, user.id);

  const result = await requestAppointmentForUser(supabase, user.id, therapistSlug, scheduledAt, modality);

  revalidatePath(`/terapeuta/${therapistSlug}`);
  revalidatePath("/dashboard");

  if (!result.ok) {
    redirect(`/terapeuta/${therapistSlug}?${result.reason === "taken" ? "ocupado=1" : "error=1"}`);
  }

  redirect(`/terapeuta/${therapistSlug}?solicitado=1`);
}

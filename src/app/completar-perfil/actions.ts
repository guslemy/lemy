"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensurePatientShell } from "@/lib/supabase/ensure-patient";
import { requestAppointmentForUser } from "@/lib/appointments";
import { isValidName, isValidPhone } from "@/lib/supabase/profile-completeness";

// Guarda nombre + teléfono del paciente y, si venía de intentar reservar una
// cita (next_slug/next_scheduled_at en el formulario), retoma esa reserva
// exacta sin que la persona tenga que volver a elegir fecha y hora.
export async function saveProfileAndContinue(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const fullName = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const nextSlug = String(formData.get("next_slug") || "");
  const nextScheduledAt = String(formData.get("next_scheduled_at") || "");
  const nextModality = formData.get("next_modality") === "presencial" ? "presencial" : "online";

  if (!isValidName(fullName) || !isValidPhone(phone)) {
    const params = new URLSearchParams({
      error: "1",
      ...(nextSlug ? { next_slug: nextSlug } : {}),
      ...(nextScheduledAt ? { next_scheduled_at: nextScheduledAt } : {}),
      ...(nextSlug ? { next_modality: nextModality } : {}),
    });
    redirect(`/completar-perfil?${params.toString()}`);
  }

  await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
  await ensurePatientShell(supabase, user.id);

  if (nextSlug && nextScheduledAt) {
    const result = await requestAppointmentForUser(supabase, user.id, nextSlug, nextScheduledAt, nextModality);
    revalidatePath(`/terapeuta/${nextSlug}`);
    revalidatePath("/dashboard");

    if (!result.ok) {
      redirect(`/terapeuta/${nextSlug}?${result.reason === "taken" ? "ocupado=1" : "error=1"}`);
    }
    redirect(`/terapeuta/${nextSlug}?solicitado=1`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?perfil_completo=1");
}

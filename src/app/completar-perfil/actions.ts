"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensurePatientShell } from "@/lib/supabase/ensure-patient";
import { requestAppointmentForUser } from "@/lib/appointments";
import { startAppointmentCheckout } from "@/lib/appointment-checkout";
import { isValidName, isValidPhone } from "@/lib/supabase/profile-completeness";
import { notifyAppointmentRequested } from "@/lib/notifications/instant";

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
  const nextPaymentMethod = formData.get("next_payment_method") === "card" ? "card" : "cash";
  const nextServiceId = String(formData.get("next_service_id") || "") || null;

  if (!isValidName(fullName) || !isValidPhone(phone)) {
    const params = new URLSearchParams({
      error: "1",
      ...(nextSlug ? { next_slug: nextSlug } : {}),
      ...(nextScheduledAt ? { next_scheduled_at: nextScheduledAt } : {}),
      ...(nextSlug ? { next_modality: nextModality } : {}),
      ...(nextServiceId ? { next_service_id: nextServiceId } : {}),
    });
    redirect(`/completar-perfil?${params.toString()}`);
  }

  await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
  await ensurePatientShell(supabase, user.id);

  if (nextSlug && nextScheduledAt) {
    const result = await requestAppointmentForUser(
      supabase,
      user.id,
      nextSlug,
      nextScheduledAt,
      nextModality,
      nextPaymentMethod,
      nextServiceId
    );
    revalidatePath(`/${nextSlug}`);
    revalidatePath("/dashboard");

    if (!result.ok) {
      const param =
        result.reason === "taken" ? "ocupado=1" : result.reason === "self" ? "propio=1" : "error=1";
      redirect(`/${nextSlug}?${param}`);
    }

    // Igual que en [slug]/actions.ts: si la cita no requiere pago (efectivo),
    // no hay Checkout al cual mandar — antes esto se pasaba por alto y
    // terminaba en un falso "error=1" porque startAppointmentCheckout
    // regresa null cuando el terapeuta no tiene Stripe Connect activo.
    if (!result.needsPayment) {
      await notifyAppointmentRequested({
        appointmentId: result.appointmentId,
        therapistId: result.therapistId,
        patientId: user.id,
        scheduledAtIso: nextScheduledAt,
      });
      redirect(`/${nextSlug}?solicitado=1#agenda`);
    }

    const checkoutUrl = await startAppointmentCheckout(result.appointmentId);
    if (!checkoutUrl) redirect(`/${nextSlug}?error=1`);
    redirect(checkoutUrl);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?perfil_completo=1");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensurePatientShell } from "@/lib/supabase/ensure-patient";
import { requestAppointmentForUser } from "@/lib/appointments";
import { startAppointmentCheckout } from "@/lib/appointment-checkout";
import { hasCompleteProfile } from "@/lib/supabase/profile-completeness";
import { notifyAppointmentRequested } from "@/lib/notifications/instant";

// Solicitud de reserva por parte del paciente. Si el terapeuta tiene Stripe
// Connect activo, la cita se crea en "pending_payment" y de inmediato se
// manda a pagar (Direct charge a su cuenta) — recién cuando el webhook
// confirma el pago se notifica al terapeuta y puede confirmar la sesión. Si
// el terapeuta NO tiene Connect activo (cobra en efectivo o por su cuenta),
// no hay paso de pago: se notifica de inmediato y queda lista para que el
// terapeuta la confirme, igual que antes se hacía solo tras el pago.
export async function requestAppointment(formData: FormData) {
  const therapistSlug = String(formData.get("therapist_slug") || "");
  const scheduledAt = String(formData.get("scheduled_at") || "");
  const modality = formData.get("modality") === "presencial" ? "presencial" : "online";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // flujo=reserva le dice a /login que venimos de intentar agendar, para
    // mostrar el copy correspondiente — antes se detectaba adivinando la
    // forma de la URL en `next` (/terapeuta/...), pero ahora que el perfil
    // vive en la raíz (/[slug]) esa URL es indistinguible de cualquier otra
    // ruta del sitio, así que hace falta esta bandera explícita.
    redirect(`/login?next=/${therapistSlug}&flujo=reserva`);
  }

  if (!therapistSlug || !scheduledAt) {
    redirect(`/${therapistSlug}?error=1#agenda`);
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

  revalidatePath(`/${therapistSlug}`);
  revalidatePath("/dashboard");

  if (!result.ok) {
    const param =
      result.reason === "taken" ? "ocupado=1" : result.reason === "self" ? "propio=1" : "error=1";
    redirect(`/${therapistSlug}?${param}#agenda`);
  }

  if (!result.needsPayment) {
    await notifyAppointmentRequested({
      appointmentId: result.appointmentId,
      therapistId: result.therapistId,
      patientId: user.id,
      scheduledAtIso: scheduledAt,
    });
    redirect(`/${therapistSlug}?solicitado=1#agenda`);
  }

  const checkoutUrl = await startAppointmentCheckout(result.appointmentId);
  if (!checkoutUrl) redirect(`/${therapistSlug}?error=1#agenda`);
  redirect(checkoutUrl);
}

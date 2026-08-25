"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatch, emailOf } from "@/lib/notifications/engine";
import { reviewReceived } from "@/lib/notifications/emailTemplates";

// El paciente llegó logueado, pero con otra cuenta a la que no pertenece
// esta cita (ver /resena/[appointmentId]/page.tsx). No hay un botón de
// "cerrar sesión" en ningún otro lado del sitio todavía, así que se
// resuelve aquí mismo: cierra la sesión actual y lo manda a /login para
// que entre con la cuenta correcta y vuelva a este mismo link.
export async function signOutAndRetry(appointmentId: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/login?next=/resena/${appointmentId}`);
}

// Manda la reseña que el paciente deja de su terapeuta. La tabla `reviews`
// ya existía desde 0001_init.sql (unique por appointment_id — una reseña
// por cita) pero nunca se había construido el flujo para llenarla.
//
// Verificación de dueño: se busca la cita filtrando por patient_id = user.id
// (no basta con confiar en el appointmentId del formulario) — mismo patrón
// que /gracias/[appointmentId]. RLS (reviews_patient_insert) exige además
// que patient_id = auth.uid() en el insert, como defensa doble.
export async function submitReview(appointmentId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, therapist_id, patient_id, status")
    .eq("id", appointmentId)
    .eq("patient_id", user.id)
    .maybeSingle();

  if (!appointment) redirect("/dashboard");
  if (appointment.status === "cancelled") {
    redirect(`/resena/${appointmentId}?error=cancelada`);
  }

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect(`/resena/${appointmentId}?error=calificacion`);
  }

  const { error } = await supabase.from("reviews").insert({
    therapist_id: appointment.therapist_id,
    patient_id: user.id,
    appointment_id: appointment.id,
    rating,
    comment: comment || null,
  });

  // unique_violation (23505): ya existe una reseña para esta cita — no es
  // un error real de cara al paciente, solo lo mandamos a ver que ya quedó.
  // Tampoco le avisamos al terapeuta en ese caso: ya se le avisó la primera
  // vez que se guardó esta misma reseña.
  if (error && error.code !== "23505") {
    redirect(`/resena/${appointmentId}?error=guardado`);
  }

  if (!error) {
    // Aviso al terapeuta — usa el cliente de servicio porque emailOf()
    // necesita la API admin de auth (no disponible con el cliente
    // limitado por RLS del paciente que hizo la reseña).
    try {
      const serviceClient = createServiceClient();
      const { data: therapist } = await serviceClient
        .from("therapists")
        .select("display_name, slug")
        .eq("id", appointment.therapist_id)
        .maybeSingle();

      if (therapist) {
        const email = await emailOf(serviceClient, appointment.therapist_id);
        const { subject, html } = reviewReceived({
          therapistName: therapist.display_name as string,
          rating,
          comment: comment || null,
          profileUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx"}/${therapist.slug}`,
        });

        await dispatch({
          supabase: serviceClient,
          type: "review_received",
          relatedId: appointment.id,
          recipientId: appointment.therapist_id,
          email,
          phone: null,
          subject,
          html,
          emailOnly: true,
        });
      }
    } catch (err) {
      console.error("Error mandando aviso de reseña recibida:", err);
    }
  }

  redirect(`/resena/${appointmentId}?ok=1`);
}

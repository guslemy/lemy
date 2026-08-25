"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  if (error && error.code !== "23505") {
    redirect(`/resena/${appointmentId}?error=guardado`);
  }

  redirect(`/resena/${appointmentId}?ok=1`);
}

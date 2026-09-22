"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { dispatch, emailOf } from "@/lib/notifications/engine";
import { therapistAccountClosed, patientAccountClosed } from "@/lib/notifications/emailTemplates";
import { THERAPIST_REASONS, PATIENT_REASONS } from "./reasons";

// Cierre de cuenta — ver conversación con Gustavo del 2026-09-22 (resumida
// en las migraciones 0040/0041). Dos caminos muy distintos:
//
// TERAPEUTA: soft-close con retención real de 90 días (el barrido en
// notifications/engine.ts purga de verdad hasta entonces) — se le avisa que
// no se guardará, aunque sí hay retención interna para recuperación de
// growth y por si se arrepiente.
//
// PACIENTE: cierre inmediato — se anonimiza el perfil (el nombre real que
// el terapeuta capturó en patient_clinical_profile NUNCA se toca, es su
// propio expediente) y se borra de una vez la credencial de acceso
// (auth.users). Gracias a que 0041 quitó el "on delete cascade" de
// profiles→auth.users, este borrado NO arrastra la fila de profiles ni
// nada de lo que el terapeuta necesita conservar.

export async function closeTherapistAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  if (profile?.role !== "therapist") redirect("/dashboard");

  const reason = String(formData.get("reason") || "").trim();
  if (!THERAPIST_REASONS.includes(reason)) return;

  const serviceClient = createServiceClient();

  const { data: therapist } = await serviceClient
    .from("therapists")
    .select("display_name, stripe_billing_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (therapist?.stripe_billing_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(therapist.stripe_billing_subscription_id as string);
    } catch (err) {
      console.error("Error cancelando suscripción de Stripe al cerrar cuenta:", err);
    }
  }

  await serviceClient
    .from("therapists")
    .update({ is_published: false, subscription_status: "canceled" })
    .eq("id", user.id);

  await serviceClient
    .from("profiles")
    .update({ account_closed_at: new Date().toISOString(), closure_reason: reason })
    .eq("id", user.id);

  try {
    const email = await emailOf(serviceClient, user.id);
    const { subject, html } = therapistAccountClosed({
      name: (therapist?.display_name as string) ?? profile.full_name ?? "",
    });
    await dispatch({
      supabase: serviceClient,
      type: "account_closed_therapist",
      relatedId: user.id,
      recipientId: user.id,
      email,
      phone: null,
      subject,
      html,
      emailOnly: true,
    });
  } catch (err) {
    console.error("Error mandando correo de cierre de cuenta (terapeuta):", err);
  }

  await supabase.auth.signOut();
  redirect("/cuenta-cerrada");
}

export async function closePatientAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  if (profile?.role !== "patient") redirect("/dashboard");

  const reason = String(formData.get("reason") || "").trim();
  if (!PATIENT_REASONS.includes(reason)) return;

  const serviceClient = createServiceClient();

  // Los correos se mandan ANTES de anonimizar/borrar — después ya no hay
  // nombre ni credencial de la cual sacar el correo.
  try {
    const email = await emailOf(serviceClient, user.id);
    const { subject, html } = patientAccountClosed({ name: profile.full_name ?? "" });
    await dispatch({
      supabase: serviceClient,
      type: "account_closed_patient",
      relatedId: user.id,
      recipientId: user.id,
      email,
      phone: null,
      subject,
      html,
      emailOnly: true,
    });
  } catch (err) {
    console.error("Error mandando correo de cierre de cuenta (paciente):", err);
  }

  await serviceClient
    .from("profiles")
    .update({
      full_name: "Usuario eliminado",
      avatar_url: null,
      phone: null,
      account_closed_at: new Date().toISOString(),
      closure_reason: reason,
    })
    .eq("id", user.id);

  // Borra SOLO la credencial de acceso — profiles/patients sobreviven a
  // propósito (0041 quitó el cascade), porque las citas/notas/expediente
  // que el terapeuta debe conservar dependen de que esa fila siga ahí.
  try {
    await serviceClient.auth.admin.deleteUser(user.id);
  } catch (err) {
    console.error("Error borrando la credencial de acceso al cerrar cuenta (paciente):", err);
  }

  redirect("/cuenta-cerrada");
}

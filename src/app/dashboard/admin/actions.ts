"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatch, emailOf } from "@/lib/notifications/engine";
import { verificationRejected } from "@/lib/notifications/emailTemplates";

async function requireAdmin() {
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
  if (profile?.role !== "admin") redirect("/dashboard");

  return { user };
}

// Desactivación reversible (a diferencia del reset masivo de prueba, que sí
// borra todo de verdad) — la cuenta deja de poder entrar (ver auth/callback
// y email-auth-form) pero sus datos siguen intactos por si se reactiva.
export async function deactivateUser(formData: FormData) {
  const { user } = await requireAdmin();
  const targetId = String(formData.get("user_id") || "");
  if (!targetId) redirect("/dashboard/admin?tab=usuarios&error=1");
  if (targetId === user.id) redirect("/dashboard/admin?tab=usuarios&error=self");

  const serviceClient = createServiceClient();
  await serviceClient
    .from("profiles")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", targetId);

  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin?tab=usuarios&desactivado=1");
}

export async function reactivateUser(formData: FormData) {
  await requireAdmin();
  const targetId = String(formData.get("user_id") || "");
  if (!targetId) redirect("/dashboard/admin?tab=usuarios&error=1");

  const serviceClient = createServiceClient();
  await serviceClient.from("profiles").update({ deactivated_at: null }).eq("id", targetId);

  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin?tab=usuarios&reactivado=1");
}

// El badge de "Cédula verificada" / "Perfil no verificado" en el perfil
// público NO está ligado a que el terapeuta haya subido documentos — se
// habilita a mano, aquí, después de que alguien del equipo los revisó desde
// el popup de verificación (ver VerificationReviewButton). Guarda quién y
// cuándo aprobó (verified_by/verified_at) para el letrero "Verificado por…".
//
// OJO permisos: por ahora esto sigue gateado por profiles.role = 'admin'
// (requireAdmin), igual que el resto del panel — no agregamos todavía un
// chequeo aparte por dominio @lemy.mx. Gustavo ya tiene la convención de
// que las cuentas @lemy.mx se marcan role='admin' a mano (ver memoria del
// equipo); si alguien de ahí necesita revisar verificaciones mantiendo su
// perfil como terapeuta de prueba, lo más simple por ahora es el mismo
// truco manual, no un segundo sistema de permisos por dominio de correo.
export async function setVerificationStatus(formData: FormData) {
  const { user } = await requireAdmin();
  const targetId = String(formData.get("therapist_id") || "");
  const status = String(formData.get("status") || "");
  if (!targetId || !["verified", "pending", "rejected"].includes(status)) {
    redirect("/dashboard/admin?tab=verificaciones&error=1");
  }

  const serviceClient = createServiceClient();
  await serviceClient
    .from("therapists")
    .update({
      verification_status: status,
      verified_at: status === "verified" ? new Date().toISOString() : null,
      verified_by: status === "verified" ? user.id : null,
    })
    .eq("id", targetId);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/perfil");
  redirect("/dashboard/admin?tab=verificaciones&verificacion_actualizada=1");
}

// Rechazo de verificación — a diferencia de "Quitar" (que solo regresa a
// pending sin avisar), esto manda un correo con el motivo. relatedId usa un
// uuid nuevo en cada llamada (no el therapist_id) a propósito: el
// dedup de notification_log es por (tipo, related_id, canal), y un mismo
// terapeuta puede ser rechazado más de una vez (sube de nuevo, se vuelve a
// rechazar) — si usáramos su id fijo, el segundo correo nunca saldría.
export async function rejectVerification(formData: FormData) {
  await requireAdmin();
  const targetId = String(formData.get("therapist_id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!targetId) redirect("/dashboard/admin?tab=verificaciones&error=1");

  const serviceClient = createServiceClient();
  await serviceClient
    .from("therapists")
    .update({ verification_status: "rejected", verified_at: null, verified_by: null })
    .eq("id", targetId);

  try {
    const { data: therapistRow } = await serviceClient
      .from("therapists")
      .select("display_name")
      .eq("id", targetId)
      .maybeSingle();
    const email = await emailOf(serviceClient, targetId);
    if (email) {
      const { subject, html } = verificationRejected({
        name: therapistRow?.display_name || "ahí",
        reason: reason || undefined,
      });
      await dispatch({
        supabase: serviceClient,
        type: "verification_rejected",
        relatedId: randomUUID(),
        recipientId: targetId,
        email,
        phone: null,
        subject,
        html,
        emailOnly: true,
      });
    }
  } catch (err) {
    console.error("Error mandando correo de rechazo de verificación:", err);
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/perfil");
  redirect("/dashboard/admin?tab=verificaciones&verificacion_actualizada=1");
}

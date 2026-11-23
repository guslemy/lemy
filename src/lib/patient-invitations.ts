import type { SupabaseClient } from "@supabase/supabase-js";
import { getResendClient, NOTIFICATIONS_FROM_EMAIL, isResendConfigured } from "@/lib/resend";
import { patientInvitation } from "@/lib/notifications/import-templates";

// Envío de invitaciones a pacientes importados, en tandas.
//
// Cada invitación queda "pending" en patient_invitations hasta que se envía,
// así que NADA se pierde entre un día y otro: lo que no cabe hoy simplemente
// sigue pendiente y sale en las siguientes corridas (el barrido del cron corre
// cada ~15 minutos).
//
// Tope diario: variable de entorno INVITATIONS_DAILY_CAP.
//   - sin definir: 60 al día (el plan gratis de Resend permite 100 al día en
//     total, y esos 100 también cubren los correos de citas y pagos: se deja
//     un margen para ellos).
//   - "0" o "unlimited": sin tope (cuando se pase a Resend Pro, que no tiene
//     límite diario).
const PER_RUN_MAX = 20;
const MAX_ATTEMPTS = 3;

function dailyCap(): number {
  const raw = process.env.INVITATIONS_DAILY_CAP;
  if (raw === undefined || raw === "") return 60;
  if (raw.toLowerCase() === "unlimited") return Infinity;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 60;
  return n <= 0 ? Infinity : n;
}

// Inicio del día de hoy en Ciudad de México (UTC-6, sin horario de verano).
function startOfTodayMexicoIso(): string {
  const now = new Date();
  const mx = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const startMx = Date.UTC(mx.getUTCFullYear(), mx.getUTCMonth(), mx.getUTCDate());
  return new Date(startMx + 6 * 60 * 60 * 1000).toISOString();
}

export async function processPatientInvitations(supabase: SupabaseClient): Promise<number> {
  if (!isResendConfigured()) return 0;

  const cap = dailyCap();
  let remaining = PER_RUN_MAX;
  if (Number.isFinite(cap)) {
    const { count, error } = await supabase
      .from("patient_invitations")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", startOfTodayMexicoIso());
    if (error) return 0; // tabla aún no existe (migración 0051 sin correr)
    remaining = Math.min(PER_RUN_MAX, Math.max(0, cap - (count ?? 0)));
  }
  if (remaining <= 0) return 0;

  const { data: pending, error } = await supabase
    .from("patient_invitations")
    .select("id, token, therapist_id, patient_id, email, attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(remaining);
  if (error || !pending?.length) return 0;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx";
  let sent = 0;

  for (const inv of pending) {
    try {
      // Si ya reclamó su cuenta por otro lado, no se manda.
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, imported_claimed_at, deactivated_at, account_closed_at")
        .eq("id", inv.patient_id)
        .maybeSingle();
      if (!prof || prof.imported_claimed_at || prof.deactivated_at || prof.account_closed_at) {
        await supabase.from("patient_invitations").update({ status: "cancelled" }).eq("id", inv.id);
        continue;
      }
      const { data: therapist } = await supabase
        .from("therapists")
        .select("display_name")
        .eq("id", inv.therapist_id)
        .maybeSingle();

      const tpl = patientInvitation({
        patientName: (prof.full_name as string | null) ?? "",
        therapistName: (therapist?.display_name as string | null) ?? "Tu terapeuta",
        activationUrl: `${site}/invitacion/${inv.token}`,
      });

      await getResendClient().emails.send({
        from: NOTIFICATIONS_FROM_EMAIL,
        to: inv.email as string,
        subject: tpl.subject,
        html: tpl.html,
      });
      await supabase
        .from("patient_invitations")
        .update({ status: "sent", sent_at: new Date().toISOString(), attempts: (inv.attempts as number) + 1, last_error: null })
        .eq("id", inv.id);

      try {
        await supabase.from("email_log").insert({
          recipient_id: inv.patient_id,
          recipient_email: inv.email,
          notification_type: "patient_invitation",
          subject: tpl.subject,
          html: tpl.html,
        });
      } catch {
        // el historial es opcional
      }
      sent += 1;
    } catch (err) {
      const attempts = (inv.attempts as number) + 1;
      await supabase
        .from("patient_invitations")
        .update({
          attempts,
          last_error: err instanceof Error ? err.message.slice(0, 300) : "error",
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        })
        .eq("id", inv.id);
      console.error(`Error enviando invitación ${inv.id}:`, err);
    }
  }
  return sent;
}

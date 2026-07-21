import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { getResendClient, NOTIFICATIONS_FROM_EMAIL, isResendConfigured } from "@/lib/resend";
import { sendWhatsAppTemplate, isWhatsAppConfigured, WhatsAppNotConfiguredError } from "@/lib/whatsapp";
import { trialEnding, renewalReminder, appointmentReminder } from "./emailTemplates";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// Cada disparador se dispara una vez dentro de esta ventana de tolerancia
// después de su momento "objetivo" — así, si el cron se cae un rato, al
// volver igual manda el recordatorio en vez de perderlo silenciosamente
// (pero no manda algo ya completamente vencido/sin sentido).
function isDue(targetMs: number, toleranceMs: number, nowMs: number) {
  return nowMs >= targetMs && nowMs < targetMs + toleranceMs;
}

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `52${digits}`; // número local MX de 10 dígitos
  return digits;
}

async function alreadySent(
  supabase: SupabaseClient,
  type: string,
  relatedId: string,
  channel: "email" | "whatsapp"
) {
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("notification_type", type)
    .eq("related_id", relatedId)
    .eq("channel", channel)
    .maybeSingle();
  return Boolean(data);
}

async function logSent(
  supabase: SupabaseClient,
  type: string,
  relatedId: string,
  channel: "email" | "whatsapp",
  recipientId: string
) {
  await supabase
    .from("notification_log")
    .insert({ notification_type: type, related_id: relatedId, channel, recipient_id: recipientId });
}

type DispatchInput = {
  supabase: SupabaseClient;
  type: string;
  relatedId: string;
  recipientId: string;
  email: string | null;
  phone: string | null;
  subject: string;
  html: string;
  whatsappTemplate?: string;
  whatsappParams?: string[];
  emailOnly?: boolean;
  attachments?: { filename: string; content: string }[]; // content en base64
};

export async function dispatch(input: DispatchInput) {
  const { supabase, type, relatedId, recipientId, email, phone, subject, html } = input;

  if (email && isResendConfigured() && !(await alreadySent(supabase, type, relatedId, "email"))) {
    try {
      await getResendClient().emails.send({
        from: NOTIFICATIONS_FROM_EMAIL,
        to: email,
        subject,
        html,
        ...(input.attachments ? { attachments: input.attachments } : {}),
      });
      await logSent(supabase, type, relatedId, "email", recipientId);
    } catch (err) {
      console.error(`Error mandando email (${type} → ${email}):`, err);
    }
  }

  if (input.emailOnly) return;

  if (phone && input.whatsappTemplate && !(await alreadySent(supabase, type, relatedId, "whatsapp"))) {
    try {
      await sendWhatsAppTemplate(phone, input.whatsappTemplate, input.whatsappParams ?? []);
      await logSent(supabase, type, relatedId, "whatsapp", recipientId);
    } catch (err) {
      if (!(err instanceof WhatsAppNotConfiguredError)) {
        console.error(`Error mandando WhatsApp (${type} → ${phone}):`, err);
      }
      // Si WhatsApp no está configurado todavía, no es un error real — solo
      // no se manda ese canal hasta que Gustavo dé de alta las credenciales.
    }
  }
}

export async function emailOf(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

export async function phonesById(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string | null>> {
  if (!ids.length) return new Map();
  const { data } = await supabase.from("profiles").select("id, phone").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id as string, p.phone as string | null]));
}

// Punto de entrada que llama el cron. Revisa los 6 disparadores y manda lo
// que corresponda — cada envío queda registrado en notification_log para no
// repetirse en la siguiente corrida.
export async function runNotificationSweep(): Promise<{ checked: number; sent: number }> {
  const supabase = createServiceClient();
  const now = Date.now();
  let sent = 0;
  let checked = 0;

  // 1 y 2. Terapeutas en periodo de prueba: aviso a 5 días y a 1 día.
  const { data: trialTherapists } = await supabase
    .from("therapists")
    .select("id, display_name, trial_ends_at, subscription_status")
    .not("trial_ends_at", "is", null)
    .neq("subscription_status", "active");

  checked += trialTherapists?.length ?? 0;
  const trialPhones = await phonesById(supabase, (trialTherapists ?? []).map((t) => t.id as string));

  for (const t of trialTherapists ?? []) {
    const trialEndsAt = new Date(t.trial_ends_at as string).getTime();
    if (now >= trialEndsAt) continue;

    for (const [type, days] of [
      ["trial_5d", 5],
      ["trial_1d", 1],
    ] as const) {
      const target = trialEndsAt - days * DAY_MS;
      if (!isDue(target, DAY_MS, now)) continue;

      const email = await emailOf(supabase, t.id as string);
      const { subject, html } = trialEnding({ name: t.display_name as string, daysLeft: days });

      await dispatch({
        supabase,
        type,
        relatedId: t.id as string,
        recipientId: t.id as string,
        email,
        phone: normalizePhone(trialPhones.get(t.id as string)),
        subject,
        html,
        whatsappTemplate: `lemy_${type}`,
        whatsappParams: [t.display_name as string, String(days)],
      });
      sent += 1;
    }
  }

  // 3 y 4. Renovación de suscripción: 3 días antes (solo correo) y 1 día
  // antes (correo + WhatsApp).
  const { data: activeTherapists } = await supabase
    .from("therapists")
    .select("id, display_name, subscription_plan, subscription_current_period_end")
    .eq("subscription_status", "active")
    .not("subscription_current_period_end", "is", null);

  checked += activeTherapists?.length ?? 0;
  const activePhones = await phonesById(supabase, (activeTherapists ?? []).map((t) => t.id as string));

  for (const t of activeTherapists ?? []) {
    const periodEnd = new Date(t.subscription_current_period_end as string).getTime();
    if (now >= periodEnd) continue;

    const email = await emailOf(supabase, t.id as string);
    const phone = normalizePhone(activePhones.get(t.id as string));

    const target3d = periodEnd - 3 * DAY_MS;
    if (isDue(target3d, DAY_MS, now)) {
      const { subject, html } = renewalReminder({
        name: t.display_name as string,
        daysLeft: 3,
        plan: t.subscription_plan as string | null,
      });
      await dispatch({
        supabase,
        type: "renewal_3d",
        relatedId: t.id as string,
        recipientId: t.id as string,
        email,
        phone: null,
        subject,
        html,
        emailOnly: true,
      });
      sent += 1;
    }

    const target1d = periodEnd - 1 * DAY_MS;
    if (isDue(target1d, DAY_MS, now)) {
      const { subject, html } = renewalReminder({
        name: t.display_name as string,
        daysLeft: 1,
        plan: t.subscription_plan as string | null,
      });
      await dispatch({
        supabase,
        type: "renewal_1d",
        relatedId: t.id as string,
        recipientId: t.id as string,
        email,
        phone,
        subject,
        html,
        whatsappTemplate: "lemy_renewal_1d",
        whatsappParams: [t.display_name as string],
      });
      sent += 1;
    }
  }

  // 5 y 6. Recordatorio de sesión para el paciente: 1 día y 1 hora antes.
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, scheduled_at, meeting_link, patient_id, therapist_id")
    .eq("status", "confirmed")
    .gte("scheduled_at", new Date(now - HOUR_MS).toISOString())
    .lte("scheduled_at", new Date(now + 2 * DAY_MS).toISOString());

  checked += appointments?.length ?? 0;

  const patientIds = Array.from(new Set((appointments ?? []).map((a) => a.patient_id as string)));
  const therapistIds = Array.from(new Set((appointments ?? []).map((a) => a.therapist_id as string)));

  const { data: patientProfiles } = patientIds.length
    ? await supabase.from("profiles").select("id, full_name, phone").in("id", patientIds)
    : { data: [] };
  const { data: therapistRows } = therapistIds.length
    ? await supabase.from("therapists").select("id, display_name").in("id", therapistIds)
    : { data: [] };

  const patientById = new Map((patientProfiles ?? []).map((p) => [p.id as string, p]));
  const therapistNameById = new Map(
    (therapistRows ?? []).map((t) => [t.id as string, t.display_name as string])
  );

  for (const a of appointments ?? []) {
    const scheduledAt = new Date(a.scheduled_at as string).getTime();
    if (now >= scheduledAt) continue;

    const patient = patientById.get(a.patient_id as string);
    const therapistName = therapistNameById.get(a.therapist_id as string) ?? "tu terapeuta";
    const email = await emailOf(supabase, a.patient_id as string);

    for (const [type, offsetMs, whenLabel, waTemplate] of [
      ["appointment_1d", DAY_MS, "mañana", "lemy_appointment_1d"],
      ["appointment_1h", HOUR_MS, "en 1 hora", "lemy_appointment_1h"],
    ] as const) {
      const target = scheduledAt - offsetMs;
      const tolerance = offsetMs === HOUR_MS ? 2 * HOUR_MS : DAY_MS;
      if (!isDue(target, tolerance, now)) continue;

      const { subject, html } = appointmentReminder({
        name: patient?.full_name ?? "paciente",
        otherPartyName: therapistName,
        whenLabel,
        meetingLink: a.meeting_link as string | null,
      });

      await dispatch({
        supabase,
        type,
        relatedId: a.id as string,
        recipientId: a.patient_id as string,
        email,
        phone: normalizePhone(patient?.phone as string | null | undefined),
        subject,
        html,
        whatsappTemplate: waTemplate,
        whatsappParams: [patient?.full_name ?? "paciente", therapistName],
      });
      sent += 1;
    }
  }

  return { checked, sent };
}

export { isWhatsAppConfigured };

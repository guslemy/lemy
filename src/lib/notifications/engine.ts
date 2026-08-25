import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { getResendClient, NOTIFICATIONS_FROM_EMAIL, isResendConfigured } from "@/lib/resend";
import { sendWhatsAppTemplate, isWhatsAppConfigured, WhatsAppNotConfiguredError } from "@/lib/whatsapp";
import { sendPushToUser } from "@/lib/webpush";
import {
  trialEnding,
  renewalReminder,
  appointmentReminder,
  therapistOnboardingChecklist,
  referralInvite,
  reviewRequest,
} from "./emailTemplates";

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
  channel: "email" | "whatsapp" | "in_app" | "push"
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
  channel: "email" | "whatsapp" | "in_app" | "push",
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
  // Notificación push (ver lib/webpush.ts) — corta a propósito, no es el
  // mismo html largo del correo. Se manda a TODAS las suscripciones
  // guardadas del destinatario (puede tener varias: celular, laptop).
  push?: { title: string; body: string; url?: string };
};

export async function dispatch(input: DispatchInput) {
  const { supabase, type, relatedId, recipientId, email, phone, subject, html } = input;

  // La notificación dentro del dashboard (campanita) se registra siempre,
  // sin importar si el correo se manda o falla — antes solo se creaba como
  // efecto secundario de un envío de Resend exitoso, así que si
  // RESEND_API_KEY faltaba o el envío fallaba, el destinatario no se
  // enteraba de nada, ni siquiera dentro de la app.
  if (!(await alreadySent(supabase, type, relatedId, "in_app"))) {
    await logSent(supabase, type, relatedId, "in_app", recipientId);
  }

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

  // Independiente de emailOnly a propósito: ese flag solo dice "no mandes
  // WhatsApp para esto" (ver referral_invite, onboarding checklist), pero
  // push sí debe poder mandarse aunque email/whatsapp no apliquen — por
  // ejemplo, el recordatorio de 1h al terapeuta no manda correo nuevo, solo
  // push (ver runNotificationSweep).
  if (input.push && !(await alreadySent(supabase, type, relatedId, "push"))) {
    try {
      await sendPushToUser(supabase, recipientId, input.push);
      await logSent(supabase, type, relatedId, "push", recipientId);
    } catch (err) {
      console.error(`Error mandando push (${type} → ${recipientId}):`, err);
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

      // Try/catch por registro: si un terapeuta con datos raros truena aquí,
      // no debe tumbar el resto de la corrida — antes un solo error a medio
      // barrido dejaba sin correo a todos los que le tocaba procesarse
      // después, aunque el cron "funcionara" en general.
      try {
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
      } catch (err) {
        console.error(`Error en barrido (${type} → therapist ${t.id}):`, err);
      }
    }
  }

  // Correo 3 de onboarding de terapeuta: 10 minutos después de activar la
  // cuenta (checklist + compartir perfil).
  //
  // Tolerancia amplia (3 horas) a propósito: el cron corre vía GitHub
  // Actions cada 15 min, pero GitHub NO garantiza esa puntualidad — las
  // corridas programadas se pueden atrasar o hasta saltarse por completo en
  // momentos de carga alta (documentado por GitHub). Con una ventana de solo
  // 20 min, cualquier atraso mayor perdía el correo para siempre (sin
  // reintento). Como este correo es un empujón suave de onboarding y no algo
  // con fecha límite real, es preferible que llegue unas horas tarde a que
  // no llegue nunca.
  const { data: newTherapists } = await supabase
    .from("therapists")
    .select("id, display_name, slug, created_at")
    .not("created_at", "is", null);

  checked += newTherapists?.length ?? 0;

  for (const t of newTherapists ?? []) {
    const createdAtMs = new Date(t.created_at as string).getTime();
    const target = createdAtMs + 10 * 60 * 1000;
    if (!isDue(target, 3 * HOUR_MS, now)) continue;

    try {
      const email = await emailOf(supabase, t.id as string);
      const profileUrl = `https://lemy.mx/${t.slug}`;
      const { subject, html } = therapistOnboardingChecklist({
        name: t.display_name as string,
        profileUrl,
      });

      await dispatch({
        supabase,
        type: "therapist_onboarding_checklist",
        relatedId: t.id as string,
        recipientId: t.id as string,
        email,
        phone: null,
        subject,
        html,
        emailOnly: true,
      });
      sent += 1;
    } catch (err) {
      console.error(`Error en barrido (therapist_onboarding_checklist → therapist ${t.id}):`, err);
    }
  }

  // Correo de "invita y ahorra": 3 días después de crear la cuenta, solo a
  // quienes ya tienen suscripción activa (pagada) — recordatorio de su
  // código de referidos. Tolerancia de 1 día porque es un disparador a
  // escala de días, igual que los de renovación.
  const { data: referralCandidates } = await supabase
    .from("therapists")
    .select("id, display_name, slug, created_at")
    .not("created_at", "is", null)
    .eq("subscription_status", "active");

  checked += referralCandidates?.length ?? 0;

  for (const t of referralCandidates ?? []) {
    const createdAtMs = new Date(t.created_at as string).getTime();
    const target = createdAtMs + 3 * DAY_MS;
    if (!isDue(target, DAY_MS, now)) continue;

    try {
      const email = await emailOf(supabase, t.id as string);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx";
      const referralLink = `${siteUrl}/api/ref?code=${t.slug}`;
      const { subject, html } = referralInvite({
        name: t.display_name as string,
        referralLink,
      });

      await dispatch({
        supabase,
        type: "referral_invite",
        relatedId: t.id as string,
        recipientId: t.id as string,
        email,
        phone: null,
        subject,
        html,
        emailOnly: true,
      });
      sent += 1;
    } catch (err) {
      console.error(`Error en barrido (referral_invite → therapist ${t.id}):`, err);
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

    try {
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
    } catch (err) {
      console.error(`Error en barrido (renewal → therapist ${t.id}):`, err);
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

    try {
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
          push:
            type === "appointment_1h"
              ? { title: "Tu sesión es en 1 hora", body: `Con ${therapistName}.`, url: "/dashboard?tab=mis-citas" }
              : undefined,
        });
        sent += 1;

        // El terapeuta no tenía ningún recordatorio de 1h antes — solo el
        // paciente. Es push nomás (sin correo/whatsapp nuevos, por ahora
        // solo se pidió esto): relatedId lleva "_therapist" para no chocar
        // con el dedup del envío de arriba, que usa el mismo (type, related_id).
        if (type === "appointment_1h") {
          await dispatch({
            supabase,
            type: `${type}_therapist`,
            relatedId: a.id as string,
            recipientId: a.therapist_id as string,
            email: null,
            phone: null,
            subject: "",
            html: "",
            push: {
              title: "Tu sesión es en 1 hora",
              body: `Con ${patient?.full_name ?? "tu paciente"}.`,
              url: "/dashboard?tab=citas",
            },
          });
        }
      }
    } catch (err) {
      console.error(`Error en barrido (appointment reminder → appointment ${a.id}):`, err);
    }
  }

  // 7. Solicitud de reseña al paciente: 2 horas después de que empezó la
  // sesión. Filtramos status="confirmed" (mismo criterio que el
  // recordatorio de arriba) — de paso ya excluye canceladas, pendientes de
  // pago y no-shows, no hace falta un check aparte para "cancelada".
  //
  // Reintento: el `relatedId` de cada envío es el id de LA CITA, así que
  // notification_log no bloquea que se vuelva a pedir en la cita 2, 3, etc.
  // con el mismo terapeuta — se sigue pidiendo en cada sesión siguiente
  // hasta que el paciente deje una reseña una vez (ver `reviewedPairs`),
  // momento en el que se deja de mandar para ese par paciente-terapeuta.
  const REVIEW_OFFSET_MS = 2 * HOUR_MS;
  const REVIEW_TOLERANCE_MS = 6 * HOUR_MS;
  const { data: reviewCandidates } = await supabase
    .from("appointments")
    .select("id, scheduled_at, patient_id, therapist_id")
    .eq("status", "confirmed")
    .gte("scheduled_at", new Date(now - REVIEW_OFFSET_MS - REVIEW_TOLERANCE_MS - HOUR_MS).toISOString())
    .lte("scheduled_at", new Date(now - REVIEW_OFFSET_MS).toISOString());

  checked += reviewCandidates?.length ?? 0;

  const { data: existingReviews } = await supabase.from("reviews").select("patient_id, therapist_id");
  const reviewedPairs = new Set(
    (existingReviews ?? []).map((r) => `${r.patient_id as string}:${r.therapist_id as string}`)
  );

  const reviewPatientIds = Array.from(new Set((reviewCandidates ?? []).map((a) => a.patient_id as string)));
  const { data: reviewPatientProfiles } = reviewPatientIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", reviewPatientIds)
    : { data: [] };
  const reviewPatientNameById = new Map(
    (reviewPatientProfiles ?? []).map((p) => [p.id as string, p.full_name as string | null])
  );

  const reviewTherapistIds = Array.from(new Set((reviewCandidates ?? []).map((a) => a.therapist_id as string)));
  const { data: reviewTherapistRows } = reviewTherapistIds.length
    ? await supabase.from("therapists").select("id, display_name").in("id", reviewTherapistIds)
    : { data: [] };
  const reviewTherapistNameById = new Map(
    (reviewTherapistRows ?? []).map((t) => [t.id as string, t.display_name as string])
  );

  const siteUrlForReviews = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx";

  for (const a of reviewCandidates ?? []) {
    const pairKey = `${a.patient_id as string}:${a.therapist_id as string}`;
    if (reviewedPairs.has(pairKey)) continue;

    const scheduledAt = new Date(a.scheduled_at as string).getTime();
    const target = scheduledAt + REVIEW_OFFSET_MS;
    if (!isDue(target, REVIEW_TOLERANCE_MS, now)) continue;

    try {
      const email = await emailOf(supabase, a.patient_id as string);
      const therapistName = reviewTherapistNameById.get(a.therapist_id as string) ?? "tu terapeuta";
      const { subject, html } = reviewRequest({
        name: reviewPatientNameById.get(a.patient_id as string) ?? "ahí",
        therapistName,
        reviewUrl: `${siteUrlForReviews}/resena/${a.id}`,
      });

      await dispatch({
        supabase,
        type: "review_request",
        relatedId: a.id as string,
        recipientId: a.patient_id as string,
        email,
        phone: null,
        subject,
        html,
        emailOnly: true,
      });
      sent += 1;
    } catch (err) {
      console.error(`Error en barrido (review_request → appointment ${a.id}):`, err);
    }
  }

  return { checked, sent };
}

export { isWhatsAppConfigured };

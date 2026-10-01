import { NextResponse } from "next/server";
import { getResendClient, NOTIFICATIONS_FROM_EMAIL, isResendConfigured } from "@/lib/resend";
import {
  verificationRejected,
  trialEnding,
  renewalReminder,
  appointmentRequestedTherapist,
  appointmentRequestedPatient,
  appointmentConfirmed,
  appointmentCancelledNotice,
  appointmentRescheduled,
  appointmentProposedByTherapist,
  appointmentAcceptedByPatient,
  appointmentProposalExpired,
  appointmentConfirmationExpiredPatient,
  appointmentConfirmationExpiredTherapist,
  appointmentPaymentReminder,
  appointmentPaymentAbandonedCancelled,
  therapistAccountClosed,
  patientAccountClosed,
  patientDormancyNotice,
  therapistWelcome,
  subscriptionWelcome,
  therapistOnboardingChecklist,
  referralInvite,
  reviewRequest,
  reviewReceived,
  appointmentReminder,
  verificationApproved,
  subscriptionPaymentFailed,
  trialEnded,
  appointmentNoShow,
  referralBonusGranted,
  patientWelcome,
  googleCalendarReconnectNeeded,
  internalVerificationSubmitted,
  monthlySummary,
} from "@/lib/notifications/emailTemplates";

export const dynamic = "force-dynamic";

// Utilidad de un solo uso para revisar copywriting/diseño: manda un ejemplo
// de CADA plantilla de correo (con datos de muestra, sin tocar la base de
// datos ni notification_log) a una dirección de prueba de un jalón, en vez
// de tener que disparar cada trigger real uno por uno.
//
// Ampliada 2026-09-27 para cubrir las 38 plantillas que existen hoy (todas
// menos appointment_1h_therapist, que no manda correo — es push-only).
//
// Protegida con el mismo patrón que /api/cron/notifications (Authorization:
// Bearer <secreto>) — nunca queda pública. Uso:
//   GET /api/admin/test-emails?to=correo@ejemplo.com
//   Header: Authorization: Bearer <TEST_EMAILS_SECRET>
// (o ?secret=<TEST_EMAILS_SECRET> en la URL, para poder dispararlo con una
// simple visita del navegador, sin necesitar curl/Postman).
//
// ?only=<key> (opcional, agregado 2026-10-01): manda un solo tipo en vez de
// los 38 — útil para revisar un rediseño puntual sin saturar la bandeja.
// Las keys usan el mismo nombre que notification_type en notification_log
// cuando aplica (ej. ?only=monthly_summary).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization");
  const secretOk =
    process.env.TEST_EMAILS_SECRET &&
    (authHeader === `Bearer ${process.env.TEST_EMAILS_SECRET}` ||
      url.searchParams.get("secret") === process.env.TEST_EMAILS_SECRET);
  if (!secretOk) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const to = url.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "falta ?to=correo@ejemplo.com" }, { status: 400 });
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ error: "RESEND_API_KEY no está configurada" }, { status: 500 });
  }

  // Datos de muestra — no salen de la base de datos, son solo para que el
  // correo se vea representativo al revisarlo. whenLabel usa el mismo
  // formato que whenLabelFor() en notifications/instant.ts.
  const WHEN = "lun 17/8 · 10:00";
  const allSamples: { key: string; email: { subject: string; html: string } }[] = [
    { key: "verification_rejected", email: verificationRejected({ name: "Gustavo", reason: "La foto de la cédula profesional salió borrosa, ¿nos la puedes volver a subir?" }) },
    { key: "trial_5d", email: trialEnding({ name: "Gustavo", daysLeft: 5 }) },
    { key: "trial_1d", email: trialEnding({ name: "Gustavo", daysLeft: 1 }) },
    { key: "renewal_3d", email: renewalReminder({ name: "Gustavo", daysLeft: 3, plan: "Gestiona" }) },
    { key: "renewal_1d", email: renewalReminder({ name: "Gustavo", daysLeft: 1, plan: "Gestiona" }) },
    { key: "appointment_requested_therapist", email: appointmentRequestedTherapist({ therapistName: "Gustavo", patientName: "María López", whenLabel: WHEN }) },
    { key: "appointment_requested_patient", email: appointmentRequestedPatient({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }) },
    {
      key: "appointment_confirmed_therapist",
      email: appointmentConfirmed({
        recipientName: "Gustavo",
        otherPartyName: "María López",
        whenLabel: WHEN,
        modality: "online",
        meetingLink: "https://meet.google.com/abc-defg-hij",
        address: null,
      }),
    },
    {
      key: "appointment_confirmed_patient",
      email: appointmentConfirmed({
        recipientName: "María López",
        otherPartyName: "Gustavo",
        whenLabel: WHEN,
        modality: "presencial",
        meetingLink: null,
        address: "Reforma 123, Centro, Oaxaca",
      }),
    },
    {
      key: "appointment_cancelled",
      email: appointmentCancelledNotice({
        recipientName: "Gustavo",
        otherPartyName: "María López",
        whenLabel: WHEN,
        cancelledByLabel: "María López",
      }),
    },
    { key: "appointment_rescheduled", email: appointmentRescheduled({ recipientName: "Gustavo", otherPartyName: "María López", newWhenLabel: "mar 18/8 · 16:00" }) },
    { key: "appointment_proposed_patient", email: appointmentProposedByTherapist({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }) },
    { key: "appointment_accepted_therapist", email: appointmentAcceptedByPatient({ therapistName: "Gustavo", patientName: "María López", whenLabel: WHEN }) },
    { key: "appointment_proposal_expired_therapist", email: appointmentProposalExpired({ therapistName: "Gustavo", patientName: "María López", whenLabel: WHEN }) },
    { key: "appointment_confirmation_expired_patient", email: appointmentConfirmationExpiredPatient({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }) },
    { key: "appointment_confirmation_expired_therapist", email: appointmentConfirmationExpiredTherapist({ therapistName: "Gustavo", patientName: "María López", whenLabel: WHEN }) },
    { key: "appointment_payment_reminder_patient", email: appointmentPaymentReminder({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }) },
    { key: "appointment_payment_abandoned_patient", email: appointmentPaymentAbandonedCancelled({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }) },
    { key: "account_closed_therapist", email: therapistAccountClosed({ name: "Gustavo" }) },
    { key: "account_closed_patient", email: patientAccountClosed({ name: "María López" }) },
    { key: "patient_dormancy_notice", email: patientDormancyNotice({ therapistName: "Gustavo", patientName: "María López" }) },
    { key: "therapist_welcome", email: therapistWelcome({ name: "Gustavo" }) },
    { key: "subscription_welcome_base", email: subscriptionWelcome({ name: "Gustavo", plan: "base" }) },
    { key: "subscription_welcome_plus", email: subscriptionWelcome({ name: "Gustavo", plan: "plus" }) },
    { key: "therapist_onboarding_checklist", email: therapistOnboardingChecklist({ name: "Gustavo", profileUrl: "https://lemy.mx/gustavo-castellanos" }) },
    { key: "referral_invite", email: referralInvite({ name: "Gustavo", referralLink: "https://lemy.mx/api/ref?code=gustavo-castellanos" }) },
    { key: "review_request", email: reviewRequest({ name: "María López", therapistName: "Gustavo", reviewUrl: "https://lemy.mx/resena/abc123" }) },
    {
      key: "review_received",
      email: reviewReceived({
        therapistName: "Gustavo",
        rating: 5,
        comment: "Gustavo es una persona muy cálida, me sentí muy escuchada.",
        profileUrl: "https://lemy.mx/gustavo-castellanos",
      }),
    },
    { key: "appointment_1d", email: appointmentReminder({ name: "Gustavo", otherPartyName: "María López", whenLabel: "mañana", meetingLink: "https://meet.google.com/abc-defg-hij" }) },
    { key: "appointment_1h", email: appointmentReminder({ name: "Gustavo", otherPartyName: "María López", whenLabel: "en 1 hora", meetingLink: "https://meet.google.com/abc-defg-hij" }) },
    { key: "verification_approved", email: verificationApproved({ name: "Gustavo" }) },
    { key: "subscription_payment_failed_retry", email: subscriptionPaymentFailed({ name: "Gustavo", nextAttemptLabel: "3 de octubre" }) },
    { key: "subscription_payment_failed_final", email: subscriptionPaymentFailed({ name: "Gustavo", nextAttemptLabel: null }) },
    { key: "trial_ended", email: trialEnded({ name: "Gustavo" }) },
    { key: "appointment_no_show", email: appointmentNoShow({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }) },
    { key: "referral_bonus_granted", email: referralBonusGranted({ name: "Gustavo", referredName: "Ana Ramírez" }) },
    { key: "patient_welcome", email: patientWelcome({ name: "María López" }) },
    { key: "google_calendar_reconnect_needed", email: googleCalendarReconnectNeeded({ name: "Gustavo" }) },
    { key: "internal_verification_submitted", email: internalVerificationSubmitted({ therapistName: "Gustavo Castellanos", therapistId: "00000000-0000-0000-0000-000000000000" }) },
    {
      key: "monthly_summary",
      email: monthlySummary({
        name: "Gustavo",
        monthLabel: "agosto 2026",
        income: 14200,
        incomePctChange: 18,
        consultations: 22,
        consultationsPctChange: -5,
        newPatients: 4,
        cancellations: 2,
        reviewsCount: 3,
        reviewsAvgRating: 4.7,
      }),
    },
  ];

  const only = url.searchParams.get("only");
  const samples = (only ? allSamples.filter((s) => s.key === only) : allSamples).map((s) => s.email);
  if (only && samples.length === 0) {
    return NextResponse.json({ error: `no existe ninguna plantilla con key "${only}"` }, { status: 400 });
  }

  const resend = getResendClient();
  const results: { subject: string; ok: boolean; error?: string }[] = [];

  for (const { subject, html } of samples) {
    try {
      await resend.emails.send({
        from: NOTIFICATIONS_FROM_EMAIL,
        to,
        subject: `[PRUEBA] ${subject}`,
        html,
      });
      results.push({ subject, ok: true });
    } catch (err) {
      results.push({ subject, ok: false, error: String(err) });
    }
    // Pausa corta entre envíos para no pegarle a Resend con 37 requests de
    // golpe (límite de su plan por segundo) — no es crítico que sea rápido,
    // esto es una utilidad de revisión manual, no un flujo de usuario real.
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return NextResponse.json({ sent: results.length, results });
}

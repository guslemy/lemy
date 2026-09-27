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
  const samples = [
    verificationRejected({ name: "Gustavo", reason: "La foto de la cédula profesional salió borrosa, ¿nos la puedes volver a subir?" }),
    trialEnding({ name: "Gustavo", daysLeft: 5 }),
    trialEnding({ name: "Gustavo", daysLeft: 1 }),
    renewalReminder({ name: "Gustavo", daysLeft: 3, plan: "Gestiona" }),
    renewalReminder({ name: "Gustavo", daysLeft: 1, plan: "Gestiona" }),
    appointmentRequestedTherapist({ therapistName: "Gustavo", patientName: "María López", whenLabel: WHEN }),
    appointmentRequestedPatient({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }),
    appointmentConfirmed({
      recipientName: "Gustavo",
      otherPartyName: "María López",
      whenLabel: WHEN,
      modality: "online",
      meetingLink: "https://meet.google.com/abc-defg-hij",
      address: null,
    }),
    appointmentConfirmed({
      recipientName: "María López",
      otherPartyName: "Gustavo",
      whenLabel: WHEN,
      modality: "presencial",
      meetingLink: null,
      address: "Reforma 123, Centro, Oaxaca",
    }),
    appointmentCancelledNotice({
      recipientName: "Gustavo",
      otherPartyName: "María López",
      whenLabel: WHEN,
      cancelledByLabel: "María López",
    }),
    appointmentRescheduled({ recipientName: "Gustavo", otherPartyName: "María López", newWhenLabel: "mar 18/8 · 16:00" }),
    appointmentProposedByTherapist({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }),
    appointmentAcceptedByPatient({ therapistName: "Gustavo", patientName: "María López", whenLabel: WHEN }),
    appointmentProposalExpired({ therapistName: "Gustavo", patientName: "María López", whenLabel: WHEN }),
    appointmentConfirmationExpiredPatient({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }),
    appointmentConfirmationExpiredTherapist({ therapistName: "Gustavo", patientName: "María López", whenLabel: WHEN }),
    appointmentPaymentReminder({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }),
    appointmentPaymentAbandonedCancelled({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }),
    therapistAccountClosed({ name: "Gustavo" }),
    patientAccountClosed({ name: "María López" }),
    patientDormancyNotice({ therapistName: "Gustavo", patientName: "María López" }),
    therapistWelcome({ name: "Gustavo" }),
    subscriptionWelcome({ name: "Gustavo", plan: "base" }),
    subscriptionWelcome({ name: "Gustavo", plan: "plus" }),
    therapistOnboardingChecklist({ name: "Gustavo", profileUrl: "https://lemy.mx/gustavo-castellanos" }),
    referralInvite({ name: "Gustavo", referralLink: "https://lemy.mx/api/ref?code=gustavo-castellanos" }),
    reviewRequest({ name: "María López", therapistName: "Gustavo", reviewUrl: "https://lemy.mx/resena/abc123" }),
    reviewReceived({
      therapistName: "Gustavo",
      rating: 5,
      comment: "Gustavo es una persona muy cálida, me sentí muy escuchada.",
      profileUrl: "https://lemy.mx/gustavo-castellanos",
    }),
    appointmentReminder({ name: "Gustavo", otherPartyName: "María López", whenLabel: "mañana", meetingLink: "https://meet.google.com/abc-defg-hij" }),
    appointmentReminder({ name: "Gustavo", otherPartyName: "María López", whenLabel: "en 1 hora", meetingLink: "https://meet.google.com/abc-defg-hij" }),
    verificationApproved({ name: "Gustavo" }),
    subscriptionPaymentFailed({ name: "Gustavo", nextAttemptLabel: "3 de octubre" }),
    subscriptionPaymentFailed({ name: "Gustavo", nextAttemptLabel: null }),
    trialEnded({ name: "Gustavo" }),
    appointmentNoShow({ patientName: "María López", therapistName: "Gustavo", whenLabel: WHEN }),
    referralBonusGranted({ name: "Gustavo", referredName: "Ana Ramírez" }),
    patientWelcome({ name: "María López" }),
    googleCalendarReconnectNeeded({ name: "Gustavo" }),
    internalVerificationSubmitted({ therapistName: "Gustavo Castellanos", therapistId: "00000000-0000-0000-0000-000000000000" }),
    monthlySummary({
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
  ];

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

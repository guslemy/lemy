import { NextResponse } from "next/server";
import { getResendClient, NOTIFICATIONS_FROM_EMAIL, isResendConfigured } from "@/lib/resend";
import {
  trialEnding,
  renewalReminder,
  appointmentRequestedTherapist,
  appointmentRequestedPatient,
  appointmentConfirmed,
  appointmentCancelledNotice,
  appointmentRescheduled,
  therapistWelcome,
  subscriptionWelcome,
  therapistOnboardingChecklist,
  appointmentReminder,
  referralInvite,
} from "@/lib/notifications/emailTemplates";

export const dynamic = "force-dynamic";

// Utilidad de un solo uso para revisar copywriting: manda un ejemplo de
// CADA plantilla de correo (con datos de muestra, sin tocar la base de
// datos ni notification_log) a una dirección de prueba de un jalón, en vez
// de tener que disparar cada trigger real uno por uno.
//
// Protegida con el mismo patrón que /api/cron/notifications (Authorization:
// Bearer <secreto>) — nunca queda pública. Uso:
//   GET /api/admin/test-emails?to=correo@ejemplo.com
//   Header: Authorization: Bearer <TEST_EMAILS_SECRET>
export async function GET(req: Request) {
  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization");
  // Acepta el secreto por header (uso normal, vía curl/Postman) o por query
  // param ?secret= (para poder dispararlo con una simple visita de URL,
  // desde entornos que no dejan mandar headers personalizados).
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
  // correo se vea representativo al revisarlo.
  const samples = [
    trialEnding({ name: "Gustavo", daysLeft: 1 }),
    renewalReminder({ name: "Gustavo", daysLeft: 1, plan: "Gestiona" }),
    appointmentRequestedTherapist({
      therapistName: "Gustavo",
      patientName: "María López",
      whenLabel: "lun 17/8 · 10:00",
    }),
    appointmentRequestedPatient({
      patientName: "María López",
      therapistName: "Gustavo",
      whenLabel: "lun 17/8 · 10:00",
    }),
    appointmentConfirmed({
      recipientName: "Gustavo",
      otherPartyName: "María López",
      whenLabel: "lun 17/8 · 10:00",
      modality: "online",
      meetingLink: "https://meet.google.com/abc-defg-hij",
      address: null,
    }),
    appointmentCancelledNotice({
      recipientName: "Gustavo",
      otherPartyName: "María López",
      whenLabel: "lun 17/8 · 10:00",
      cancelledByLabel: "María López",
    }),
    appointmentRescheduled({
      recipientName: "Gustavo",
      otherPartyName: "María López",
      newWhenLabel: "mar 18/8 · 16:00",
    }),
    therapistWelcome({ name: "Gustavo" }),
    subscriptionWelcome({ name: "Gustavo", plan: "base" }),
    subscriptionWelcome({ name: "Gustavo", plan: "plus" }),
    therapistOnboardingChecklist({
      name: "Gustavo",
      profileUrl: "https://lemy.mx/gustavo-castellanos",
    }),
    appointmentReminder({
      name: "Gustavo",
      otherPartyName: "María López",
      whenLabel: "mañana",
      meetingLink: "https://meet.google.com/abc-defg-hij",
    }),
    referralInvite({
      name: "Gustavo",
      referralLink: "https://lemy.mx/api/ref?code=gustavo-castellanos",
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
  }

  return NextResponse.json({ sent: results.length, results });
}

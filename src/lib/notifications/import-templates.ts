// Correo de invitación a un paciente importado (ver lib/patient-invitations.ts).

import { wrap } from "./emailTemplates";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function patientInvitation(params: { patientName: string; therapistName: string; activationUrl: string }) {
  const { patientName, therapistName, activationUrl } = params;
  return {
    subject: `${therapistName} te invita a tu cuenta en Lemy`,
    html: wrap(`
      <h1 style="font-size: 21px; margin: 0 0 14px; color: #21382b; font-weight: 600;">Hola, ${esc(patientName)}</h1>
      <p><strong>${esc(therapistName)}</strong>, tu terapeuta, usa Lemy para llevar su agenda y te invita a activar tu cuenta.</p>
      <p>Con tu cuenta puedes ver tus citas, agendar y reagendar sesiones, recibir recordatorios y pagar con tarjeta si tu terapeuta lo ofrece.</p>
      <p style="margin: 24px 0 0;"><a href="${activationUrl}" style="display: inline-block; background: #21382b; color: #ffffff; padding: 11px 22px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">Activar mi cuenta →</a></p>
      <p style="margin-top: 22px; font-size: 13px; color: #7C877F;">Solo te pediremos elegir una contraseña. Si no reconoces a este terapeuta, o no quieres una cuenta, ignora este mensaje; no se activará nada. Para que eliminemos tus datos, escríbenos a <a href="mailto:hola@lemy.mx" style="color: #8B978F;">hola@lemy.mx</a>.</p>
    `),
  };
}

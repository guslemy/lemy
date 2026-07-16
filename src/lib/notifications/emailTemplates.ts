// Plantillas de correo — texto plano/HTML simple, tono cálido y coloquial
// consistente con el resto de Lemy. Cada función regresa { subject, html }.

const BRAND = "Lemy";

function wrap(bodyHtml: string) {
  return `<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1F2A22;">
    <p style="font-family: monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #B4574B;">${BRAND}</p>
    ${bodyHtml}
    <p style="margin-top: 32px; font-size: 13px; color: #8B978F;">— El equipo de Lemy</p>
  </div>`;
}

export function trialEnding(params: { name: string; daysLeft: number }) {
  const { name, daysLeft } = params;
  return {
    subject:
      daysLeft === 1
        ? "Tu prueba gratis en Lemy termina mañana"
        : `Tu prueba gratis en Lemy termina en ${daysLeft} días`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>Tu prueba gratis de 15 días en Lemy ${
        daysLeft === 1 ? "termina mañana" : `termina en ${daysLeft} días`
      }. Si quieres que tu perfil siga visible para pacientes sin interrupción, suscríbete cuando quieras desde tu panel.</p>
      <p><a href="https://lemy.mx/dashboard/suscripcion" style="color: #2F5233;">Ir a mi suscripción →</a></p>
    `),
  };
}

export function renewalReminder(params: { name: string; daysLeft: number; plan: string | null }) {
  const { name, daysLeft, plan } = params;
  return {
    subject:
      daysLeft === 1
        ? "Tu suscripción a Lemy se renueva mañana"
        : `Tu suscripción a Lemy se renueva en ${daysLeft} días`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>Te avisamos que tu suscripción${plan ? ` al plan ${plan}` : ""} se renueva ${
        daysLeft === 1 ? "mañana" : `en ${daysLeft} días`
      }. No necesitas hacer nada si todo sigue igual — el cobro es automático con el método de pago que registraste.</p>
      <p><a href="https://lemy.mx/dashboard/suscripcion" style="color: #2F5233;">Ver mi suscripción →</a></p>
    `),
  };
}

export function appointmentReminder(params: {
  name: string;
  otherPartyName: string;
  whenLabel: string;
  meetingLink: string | null;
}) {
  const { name, otherPartyName, whenLabel, meetingLink } = params;
  return {
    subject: `Recordatorio: tu sesión es ${whenLabel}`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>Te recordamos que tu sesión con ${otherPartyName} es ${whenLabel}.</p>
      ${
        meetingLink
          ? `<p><a href="${meetingLink}" style="color: #2F5233;">Entrar a la videollamada →</a></p>`
          : ""
      }
      <p><a href="https://lemy.mx/dashboard/mis-citas" style="color: #2F5233;">Ver mis citas →</a></p>
    `),
  };
}

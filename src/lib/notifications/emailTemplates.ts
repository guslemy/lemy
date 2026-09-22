// Plantillas de correo — texto plano/HTML simple, tono cálido y coloquial
// consistente con el resto de Lemy. Cada función regresa { subject, html }.

import { PLAN_FEATURES_BASE, PLAN_FEATURES_PLUS } from "@/lib/plan-features";

const BRAND = "Lemy";

function wrap(bodyHtml: string) {
  return `<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1F2A22;">
    <p style="font-family: monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #B4574B;">${BRAND}</p>
    ${bodyHtml}
    <p style="margin-top: 32px; font-size: 13px; color: #8B978F;">— El equipo de Lemy</p>
    <p style="margin-top: 8px; font-size: 12px; color: #B7C0BA;">Este es un correo automático, no respondas a este mensaje. Si necesitas ayuda, escríbenos a hola@lemy.mx.</p>
  </div>`;
}

// Cuando el equipo de Lemy rechaza los documentos de verificación de un
// terapeuta desde /dashboard/admin — reason es opcional (textarea libre en
// el popup de revisión).
export function verificationRejected(params: { name: string; reason?: string }) {
  const { name, reason } = params;
  return {
    subject: "Tu verificación en Lemy necesita un ajuste",
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>Revisamos los documentos que subiste para verificar tu perfil en Lemy, y por ahora no pudimos aprobarlos.</p>
      ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ""}
      <p>Puedes volver a subirlos desde tu panel cuando quieras — solo actualiza el documento que haga falta.</p>
      <p><a href="https://lemy.mx/dashboard/perfil" style="color: #2F5233;">Ir a mi perfil →</a></p>
    `),
  };
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

// Al instante, cuando el paciente solicita la cita — no es un recordatorio
// programado, se dispara directo desde la acción de reserva.
export function appointmentRequestedTherapist(params: {
  therapistName: string;
  patientName: string;
  whenLabel: string;
}) {
  const { therapistName, patientName, whenLabel } = params;
  return {
    subject: `Nueva solicitud de cita — ${patientName}`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${therapistName}</h1>
      <p><strong>${patientName}</strong> solicitó una cita contigo para el <strong>${whenLabel}</strong>.</p>
      <p><a href="https://lemy.mx/dashboard/citas" style="color: #2F5233;">Ir a confirmarla →</a></p>
    `),
  };
}

// Recibo inmediato para el paciente — no dice "confirmada" porque, hoy,
// todavía falta que el terapeuta la confirme a mano (transitorio, hasta
// que Stripe cobre el anticipo automáticamente y el espacio quede
// asegurado de una vez al reservar).
export function appointmentRequestedPatient(params: {
  patientName: string;
  therapistName: string;
  whenLabel: string;
}) {
  const { patientName, therapistName, whenLabel } = params;
  return {
    subject: `Recibimos tu solicitud con ${therapistName}`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${patientName}</h1>
      <p>Tu solicitud de cita con <strong>${therapistName}</strong> para el <strong>${whenLabel}</strong> quedó registrada.</p>
      <p>En cuanto ${therapistName.split(" ")[0]} la confirme, te avisamos con el enlace de tu sesión.</p>
      <p><a href="https://lemy.mx/dashboard/mis-citas" style="color: #2F5233;">Ver mis citas →</a></p>
    `),
  };
}

// Al instante, cuando el terapeuta confirma la cita. Si es en línea, trae el
// link real de la sesión (Google Meet o, si no hay Google conectado, la sala
// de respaldo de Jitsi). Si es presencial, trae la dirección del consultorio
// en vez de cualquier link — nunca deben aparecer los dos a la vez, para no
// confundir a nadie sobre dónde es realmente la sesión. Siempre va adjunta
// una invitación de calendario (.ics) que cualquier cliente de correo
// reconoce, sin importar el proveedor.
export function appointmentConfirmed(params: {
  recipientName: string;
  otherPartyName: string;
  whenLabel: string;
  modality: "online" | "presencial";
  meetingLink: string | null;
  address: string | null;
}) {
  const { recipientName, otherPartyName, whenLabel, modality, meetingLink, address } = params;
  return {
    subject: `Cita confirmada — ${whenLabel}`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${recipientName}</h1>
      <p>Tu cita <strong>${modality === "online" ? "en línea" : "presencial"}</strong> con <strong>${otherPartyName}</strong> quedó confirmada para el <strong>${whenLabel}</strong>.</p>
      ${
        modality === "online" && meetingLink
          ? `<p><a href="${meetingLink}" style="color: #2F5233;">Entrar a la videollamada →</a></p>`
          : ""
      }
      ${
        modality === "presencial" && address
          ? `<p><strong>Dirección:</strong> ${address}</p>`
          : ""
      }
      <p>Te dejamos adjunta la invitación de calendario — ábrela para agregarla a Gmail, Outlook, Apple Calendar o el que uses.</p>
      <p><a href="https://lemy.mx/dashboard/mis-citas" style="color: #2F5233;">Ver mis citas →</a></p>
    `),
  };
}

export function appointmentCancelledNotice(params: {
  recipientName: string;
  otherPartyName: string;
  whenLabel: string;
  cancelledByLabel: string;
}) {
  const { recipientName, otherPartyName, whenLabel, cancelledByLabel } = params;
  return {
    subject: `Cita cancelada — ${whenLabel}`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${recipientName}</h1>
      <p>${cancelledByLabel} canceló la cita del <strong>${whenLabel}</strong> con ${otherPartyName}.</p>
    `),
  };
}

export function appointmentRescheduled(params: {
  recipientName: string;
  otherPartyName: string;
  newWhenLabel: string;
}) {
  const { recipientName, otherPartyName, newWhenLabel } = params;
  return {
    subject: `Tu cita cambió de horario — nuevo horario ${newWhenLabel}`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${recipientName}</h1>
      <p>${otherPartyName} movió la cita a un nuevo horario: <strong>${newWhenLabel}</strong>.</p>
    `),
  };
}

// Al instante, cuando el TERAPEUTA agenda directo una cita con un paciente
// suyo (ficha de paciente → "Agendar consulta con este paciente", a
// petición de Gustavo 2026-09-21) — el paciente tiene 24 horas para
// aceptar (y pagar, si aplica con tarjeta) o rechazar antes de que el
// horario se libere solo.
export function appointmentProposedByTherapist(params: {
  patientName: string;
  therapistName: string;
  whenLabel: string;
}) {
  const { patientName, therapistName, whenLabel } = params;
  return {
    subject: `${therapistName} agendó una cita contigo — tienes 24 horas para aceptarla`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${patientName}</h1>
      <p><strong>${therapistName}</strong> agendó una cita contigo para el <strong>${whenLabel}</strong>.</p>
      <p>Tienes <strong>24 horas</strong> para aceptarla o rechazarla. Si no respondes en ese tiempo, el horario se libera automáticamente.</p>
      <p><a href="https://lemy.mx/dashboard?tab=citas" style="color: #2F5233;">Responder ahora →</a></p>
    `),
  };
}

// Al instante, cuando el paciente acepta una cita propuesta por el
// terapeuta y no requiere pago con tarjeta (efectivo) — todavía falta que
// el terapeuta la confirme desde su panel (mismo paso final que cualquier
// otra solicitud pendiente de confirmar).
export function appointmentAcceptedByPatient(params: { therapistName: string; patientName: string; whenLabel: string }) {
  const { therapistName, patientName, whenLabel } = params;
  return {
    subject: `${patientName} aceptó la cita — ${whenLabel}`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${therapistName}</h1>
      <p><strong>${patientName}</strong> aceptó la cita que le propusiste para el <strong>${whenLabel}</strong>.</p>
      <p>Solo falta que la confirmes desde tu panel para dejarla lista.</p>
      <p><a href="https://lemy.mx/dashboard?tab=citas" style="color: #2F5233;">Ir a confirmarla →</a></p>
    `),
  };
}

// Cuando pasan las 24 horas sin que el paciente responda a una propuesta —
// el barrido del cron cancela la cita sola y le avisa al terapeuta de que
// el horario ya quedó libre otra vez.
export function appointmentProposalExpired(params: { therapistName: string; patientName: string; whenLabel: string }) {
  const { therapistName, patientName, whenLabel } = params;
  return {
    subject: `${patientName} no respondió a tiempo — horario liberado`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${therapistName}</h1>
      <p><strong>${patientName}</strong> no respondió dentro de las 24 horas a la cita que le propusiste para el <strong>${whenLabel}</strong>, así que se canceló y el horario ya quedó libre otra vez.</p>
      <p><a href="https://lemy.mx/dashboard/pacientes" style="color: #2F5233;">Ver mis pacientes →</a></p>
    `),
  };
}

// Cuando una cita EN EFECTIVO (o una con tarjeta que el paciente nunca
// terminó de pagar) no se resuelve dentro de las 24 horas (a petición de
// Gustavo 2026-09-21, ver runNotificationSweep en engine.ts). Un pago con
// tarjeta ya cobrado nunca llega hasta aquí — ese se confirma solo en
// cuanto se cobra, sin pasar por este estado.
export function appointmentConfirmationExpiredPatient(params: {
  patientName: string;
  therapistName: string;
  whenLabel: string;
}) {
  const { patientName, therapistName, whenLabel } = params;
  return {
    subject: `Tu cita con ${therapistName} se canceló — no se confirmó a tiempo`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${patientName}</h1>
      <p>Tu cita con <strong>${therapistName}</strong> para el <strong>${whenLabel}</strong> no se confirmó dentro de las 24 horas, así que se canceló automáticamente.</p>
      <p>Puedes volver a agendar cuando quieras.</p>
      <p><a href="https://lemy.mx/buscar" style="color: #2F5233;">Buscar un horario →</a></p>
    `),
  };
}

export function appointmentConfirmationExpiredTherapist(params: {
  therapistName: string;
  patientName: string;
  whenLabel: string;
}) {
  const { therapistName, patientName, whenLabel } = params;
  return {
    subject: `No confirmaste a tiempo — se canceló la cita con ${patientName}`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${therapistName}</h1>
      <p>La cita con <strong>${patientName}</strong> para el <strong>${whenLabel}</strong> no se confirmó dentro de las 24 horas, así que se canceló sola y el horario ya quedó libre otra vez.</p>
      <p>Recuerda confirmar tus solicitudes en efectivo dentro de las primeras 24 horas para no perderlas.</p>
      <p><a href="https://lemy.mx/dashboard?tab=citas" style="color: #2F5233;">Ir a mis citas →</a></p>
    `),
  };
}

// A los 5 minutos de crear una cita con pago por tarjeta, si el pago
// todavía no se completó (checkout abandonado, tarjeta rechazada, etc.) —
// a petición de Gustavo (2026-09-21). Recordatorio suave, la cita sigue
// viva todavía — el aviso de que se liberó el horario es otro, a los 20 min
// (appointmentPaymentAbandonedCancelled).
export function appointmentPaymentReminder(params: { patientName: string; therapistName: string; whenLabel: string }) {
  const { patientName, therapistName, whenLabel } = params;
  return {
    subject: `¿Qué pasó con tu pago? — cita con ${therapistName}`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${patientName}</h1>
      <p>Empezaste a reservar una cita con <strong>${therapistName}</strong> para el <strong>${whenLabel}</strong>, pero no vemos que se haya completado el pago.</p>
      <p>Tienes unos minutos más para terminarlo antes de que se libere el horario — si tu tarjeta fue rechazada o simplemente cambiaste de opinión, no necesitas hacer nada.</p>
      <p><a href="https://lemy.mx/dashboard?tab=citas" style="color: #2F5233;">Ver mis citas →</a></p>
    `),
  };
}

// A los 20 minutos, si el pago con tarjeta sigue sin completarse — el
// horario ya se liberó.
export function appointmentPaymentAbandonedCancelled(params: { patientName: string; therapistName: string; whenLabel: string }) {
  const { patientName, therapistName, whenLabel } = params;
  return {
    subject: `Se liberó el horario con ${therapistName} — no se completó el pago`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${patientName}</h1>
      <p>Como no se completó el pago de tu cita con <strong>${therapistName}</strong> para el <strong>${whenLabel}</strong>, liberamos el horario para que otra persona pueda tomarlo.</p>
      <p>Puedes volver a agendar cuando quieras.</p>
      <p><a href="https://lemy.mx/buscar" style="color: #2F5233;">Buscar un horario →</a></p>
    `),
  };
}

// ─────────────────────────────────────────────
// Cierre de cuenta — ver conversación con Gustavo del 2026-09-22.
// Terapeuta: retención real de 90 días (ver engine.ts), pero el mensaje NO
// lo menciona — se le dice que no se guardará, para que exporte ya.
// Paciente: cierre inmediato, sin promesa de respaldo (no la hay).
// ─────────────────────────────────────────────
export function therapistAccountClosed(params: { name: string }) {
  const { name } = params;
  return {
    subject: "Confirmamos el cierre de tu cuenta en Lemy",
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>Confirmamos que cerraste tu cuenta de terapeuta en Lemy. Tu perfil ya no es visible y tu suscripción quedó cancelada.</p>
      <p><strong>Importante:</strong> por la NOM-004-SSA3-2012 debes conservar el expediente de tus pacientes por un mínimo de 5 años. Tu expediente en Lemy no se conservará por motivos de seguridad, así que si aún no lo descargaste, hazlo antes de que se elimine por completo.</p>
      <p>Si cambias de opinión, contáctanos a hola@lemy.mx.</p>
    `),
  };
}

export function patientAccountClosed(params: { name: string }) {
  const { name } = params;
  return {
    subject: "Confirmamos el cierre de tu cuenta en Lemy",
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>Confirmamos que cerraste tu cuenta en Lemy. Ya no podrás iniciar sesión con ella.</p>
      <p>Tu salud mental es importante. Si en algún momento quieres retomar un proceso terapéutico, aquí vas a encontrar a quien pueda acompañarte.</p>
    `),
  };
}

// Aviso al terapeuta cuando un paciente lleva ~1 mes sin visitarlo —
// recordatorio de exportar el expediente para cumplir con la NOM.
export function patientDormancyNotice(params: { therapistName: string; patientName: string }) {
  const { therapistName, patientName } = params;
  return {
    subject: `${patientName} no te ha visitado en el último mes`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${therapistName}</h1>
      <p><strong>${patientName}</strong> no te ha visitado en el último mes. Recuerda que puedes descargar su historial clínico desde su ficha para conservarlo en tus expedientes personales y cumplir con la NOM-004-SSA3-2012.</p>
      <p><a href="https://lemy.mx/dashboard?tab=pacientes" style="color: #2F5233;">Ir a mis pacientes →</a></p>
    `),
  };
}

// Tabla comparativa en HTML de tabla (no flex/grid — la mayoría de clientes
// de correo los ignoran) para el correo de bienvenida de terapeuta nuevo.
function planComparisonTable() {
  const extrasPlus = PLAN_FEATURES_PLUS.slice(1); // se salta el "Todo lo anterior, más:"
  const rows = [...PLAN_FEATURES_BASE.map((f) => ({ label: f.label, base: true, plus: true }))];
  for (const f of extrasPlus) rows.push({ label: f.label, base: false, plus: true });

  const check = (yes: boolean) =>
    `<td style="padding: 6px 8px; text-align: center; color: ${yes ? "#2F5233" : "#D8DED9"};">${yes ? "✓" : "—"}</td>`;

  return `
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
      <thead>
        <tr>
          <td style="padding: 6px 8px;"></td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 600; color: #1F2A22;">Empieza<br/>$249</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 600; color: #1F2A22;">Gestiona<br/>$399</td>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) => `
          <tr style="border-top: 1px solid #E7E2D8;">
            <td style="padding: 6px 8px; color: #3E4B44;">${r.label}</td>
            ${check(r.base)}
            ${check(r.plus)}
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// Bienvenida al crear la cuenta de terapeuta (sin pago todavía) — invita a
// elegir un plan con la tabla comparativa completa. Se dispara una sola vez,
// justo cuando se activa la cuenta de terapeuta (ver becomeTherapist).
export function therapistWelcome(params: { name: string }) {
  const { name } = params;
  return {
    subject: `¡Bienvenido a Lemy, ${name.split(" ")[0]}!`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>Tu cuenta de terapeuta en Lemy ya está lista. Tienes 15 días de prueba gratis para armar tu
      perfil y ver cómo funciona todo, sin compromiso.</p>
      <p>Cuando quieras dar el siguiente paso, así se comparan los dos planes:</p>
      ${planComparisonTable()}
      <p><a href="https://lemy.mx/dashboard/suscripcion" style="color: #2F5233;">Elegir mi plan →</a></p>
    `),
  };
}

// Bienvenida al momento en que la suscripción se activa con pago real
// (webhook de Stripe). El contenido varía según el plan al que se
// suscribió — solo se invita a hacer upgrade si se quedó en Empieza,
// nunca si ya está en el plan más alto.
export function subscriptionWelcome(params: { name: string; plan: "base" | "plus" }) {
  const { name, plan } = params;
  const planLabel = plan === "plus" ? "Gestiona" : "Empieza";
  const features = plan === "plus" ? PLAN_FEATURES_PLUS : PLAN_FEATURES_BASE;

  return {
    subject: `¡Bienvenido al plan ${planLabel} de Lemy!`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>Tu suscripción al plan <strong>${planLabel}</strong> ya está activa. Esto es lo que tienes disponible:</p>
      <ul style="padding-left: 18px; color: #3E4B44;">
        ${features.map((f) => `<li style="margin-bottom: 6px;">${f.label}</li>`).join("")}
      </ul>
      ${
        plan === "base"
          ? `<p>Cuando quieras más control — expediente clínico completo, cobros en línea y recordatorios por
             WhatsApp — puedes hacer upgrade a Gestiona cuando gustes, sin perder nada de lo que ya tienes.</p>
             <p><a href="https://lemy.mx/dashboard/suscripcion" style="color: #2F5233;">Ver el plan Gestiona →</a></p>`
          : `<p>Gracias por confiar en Lemy para hacer crecer tu práctica.</p>`
      }
    `),
  };
}

// 10 minutos después de activar la cuenta de terapeuta — checklist rápido
// para dejar todo listo, más un link de WhatsApp pre-armado para compartir
// el perfil público (no se puede copiar al portapapeles desde un correo,
// así que en su lugar se prellena el mensaje de WhatsApp con el link).
export function therapistOnboardingChecklist(params: { name: string; profileUrl: string }) {
  const { name, profileUrl } = params;
  const waText = encodeURIComponent(
    `Ya estoy en Lemy — aquí puedes agendar una consulta conmigo: ${profileUrl}`
  );
  return {
    subject: "Comienza a recibir pacientes hoy mismo",
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>Unos últimos pasos para dejar tu cuenta lista y empezar a recibir pacientes:</p>
      <ol style="padding-left: 18px; color: #3E4B44;">
        <li style="margin-bottom: 8px;">Date una vuelta por tu panel para ubicarte.</li>
        <li style="margin-bottom: 8px;"><a href="https://lemy.mx/dashboard/perfil" style="color: #2F5233;">Configura tu perfil profesional →</a></li>
        <li style="margin-bottom: 8px;"><a href="https://lemy.mx/dashboard/perfil" style="color: #2F5233;">Conecta tu Google Calendar →</a></li>
        <li style="margin-bottom: 8px;"><a href="https://lemy.mx/dashboard/pagos" style="color: #2F5233;">Activa tus cobros con tarjeta →</a></li>
      </ol>
      <p>Y ya que tu perfil esté listo, compártelo con quien quieras:</p>
      <p><a href="https://wa.me/?text=${waText}" style="color: #2F5233;">Compartir mi perfil por WhatsApp →</a></p>
    `),
  };
}

// 3 días después de crear la cuenta, solo a terapeutas que ya tienen
// suscripción activa (pagada) — les recuerda su código de referidos y el
// beneficio para ambos lados (30% x 1 mes para quien invita, 30% x 2 meses
// para la persona invitada). Se dispara desde el barrido del cron.
export function referralInvite(params: { name: string; referralLink: string }) {
  const { name, referralLink } = params;
  return {
    subject: "Invita a otros terapeutas y ahorra en tu mensualidad",
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>¿Sabías que puedes ahorrar en tu suscripción a Lemy solo por invitar a otros terapeutas?</p>
      <p>Comparte tu link personal. En cuanto la persona que invitaste active su suscripción:</p>
      <ul style="padding-left: 18px; color: #3E4B44;">
        <li style="margin-bottom: 6px;">Tú obtienes <strong>30% de descuento en tu siguiente mensualidad</strong>.</li>
        <li style="margin-bottom: 6px;">Ella o él obtiene <strong>30% de descuento durante sus primeros 2 meses</strong>.</li>
      </ul>
      <p style="font-size: 13px; color: #8B978F;">Para poder aprovechar tu descuento, tu propia suscripción debe estar activa (no solo en periodo de prueba) en el momento en que tu invitado se suscriba.</p>
      <p style="word-break: break-all; background: #F5F1E8; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: #2F5233;">${referralLink}</p>
      <p><a href="https://lemy.mx/dashboard" style="color: #2F5233;">Ir a mi panel →</a></p>
    `),
  };
}

// 2 horas después de la sesión (solo citas confirmadas, ver engine.ts) —
// pide reseña al paciente. Copy aprobado por Gustavo (2026-08-24).
export function reviewRequest(params: { name: string; therapistName: string; reviewUrl: string }) {
  const { name, therapistName, reviewUrl } = params;
  return {
    subject: `¿Cómo te fue con ${therapistName}?`,
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${name}</h1>
      <p>Hace un rato tuviste tu sesión con ${therapistName}. ¿Nos regalas un minuto para contarnos cómo te fue? Tu opinión ayuda a que otras personas que están buscando a alguien como ${therapistName} se animen a dar el paso.</p>
      <p><a href="${reviewUrl}" style="color: #2F5233;">Dejar mi reseña →</a></p>
      <p style="font-size: 13px; color: #8B978F;">Es rápido y toma menos de un minuto.</p>
    `),
  };
}

// Al instante, cuando un paciente deja una reseña (ver
// /resena/[appointmentId]/actions.ts). No se manda si ya existía una
// reseña para esa cita (solo se dispara una vez, en la creación).
export function reviewReceived(params: {
  therapistName: string;
  rating: number;
  comment: string | null;
  profileUrl: string;
}) {
  const { therapistName, rating, comment, profileUrl } = params;
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  return {
    subject: "Recibiste una nueva reseña en Lemy",
    html: wrap(`
      <h1 style="font-size: 20px;">Hola, ${therapistName}</h1>
      <p>Un paciente acaba de dejarte una reseña:</p>
      <p style="font-size: 20px; letter-spacing: 2px; color: #B5654F;">${stars}</p>
      ${comment ? `<p style="font-style: italic; color: #3E4B44;">&quot;${comment}&quot;</p>` : ""}
      <p><a href="${profileUrl}" style="color: #2F5233;">Ver mi perfil público →</a></p>
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

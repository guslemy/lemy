// Catálogo ÚNICO de plantillas de WhatsApp de Lemy.
//
// Se usa para tres cosas:
//  1. La herramienta "WhatsApp manual" del panel de admin (envío a mano por
//     link wa.me durante la fase beta).
//  2. Como lista de textos para dar de alta en WhatsApp Manager (Meta) cuando
//     el negocio quede verificado: `name` debe ser IGUAL al nombre de la
//     plantilla allá, y {{1}}, {{2}}… son sus variables, en ese orden.
//  3. (Siguiente paso) como referencia de qué plan recibe qué aviso.
//
// IMPORTANTE: el orden de `params` es el mismo que ya manda el motor de
// notificaciones (`whatsappParams` en engine.ts / instant.ts). Si se cambia un
// texto o el orden, hay que cambiarlo también en WhatsApp Manager.

export type WaParamKind = "recipient_name" | "text";

export type WaParam = {
  key: string;
  label: string;
  kind: WaParamKind; // recipient_name: se autorrellena con el usuario elegido
  placeholder?: string;
};

export type WaTemplate = {
  name: string; // nombre exacto en WhatsApp Manager
  label: string; // cómo se ve en la herramienta
  audience: "terapeuta" | "paciente" | "ambos";
  // essential = lo reciben TODOS los terapeutas (plan Empieza incluido);
  // full = solo plan Gestiona (y pacientes con permiso). Ver estrategia B.
  tier: "essential" | "full";
  params: WaParam[];
  body: string; // con {{1}}, {{2}}… (formato de Meta)
};

const WHEN = (label = "Fecha y hora"): WaParam => ({
  key: "when",
  label,
  kind: "text",
  placeholder: "ej. jue 12/11 · 18:00",
});
const NAME = (label: string): WaParam => ({ key: label, label, kind: "recipient_name" });
const OTHER = (label: string): WaParam => ({ key: label, label, kind: "text", placeholder: "Nombre" });

export const WA_TEMPLATES: WaTemplate[] = [
  // ── Suscripción (terapeutas) ──
  {
    name: "lemy_trial_5d",
    label: "Prueba gratis termina en 5 días",
    audience: "terapeuta",
    tier: "essential",
    params: [NAME("Nombre del terapeuta"), { key: "days", label: "Días restantes", kind: "text", placeholder: "5" }],
    body:
      "Hola {{1}}, tu prueba gratis en Lemy termina en {{2}} días. Elige tu plan en lemy.mx/dashboard para seguir recibiendo pacientes sin interrupciones.",
  },
  {
    name: "lemy_trial_1d",
    label: "Prueba gratis termina mañana",
    audience: "terapeuta",
    tier: "essential",
    params: [NAME("Nombre del terapeuta"), { key: "days", label: "Días restantes", kind: "text", placeholder: "1" }],
    body:
      "Hola {{1}}, tu prueba gratis en Lemy termina mañana ({{2}} día). Elige tu plan en lemy.mx/dashboard para no perder tu lugar ni tus citas.",
  },
  {
    name: "lemy_renewal_1d",
    label: "Tu suscripción se renueva mañana",
    audience: "terapeuta",
    tier: "essential",
    params: [NAME("Nombre del terapeuta")],
    body:
      "Hola {{1}}, tu suscripción de Lemy se renueva mañana. Si necesitas cambiar tu plan o tu método de pago, puedes hacerlo en lemy.mx/dashboard.",
  },

  // ── Recordatorios de sesión ──
  {
    name: "lemy_appointment_1d",
    label: "Recordatorio de sesión (mañana)",
    audience: "paciente",
    tier: "full",
    params: [NAME("Nombre del paciente"), OTHER("Nombre del terapeuta")],
    body:
      "Hola {{1}}, te recordamos que mañana tienes tu sesión con {{2}}. Encuentras los detalles en lemy.mx/dashboard.",
  },
  {
    name: "lemy_appointment_1h",
    label: "Recordatorio de sesión (en 1 hora)",
    audience: "paciente",
    tier: "full",
    params: [NAME("Nombre del paciente"), OTHER("Nombre del terapeuta")],
    body:
      "Hola {{1}}, tu sesión con {{2}} empieza en 1 hora. Entra a lemy.mx/dashboard para ver cómo conectarte o llegar.",
  },

  // ── Ciclo de vida de una cita ──
  {
    name: "lemy_appointment_requested_therapist",
    label: "Nueva solicitud de cita (al terapeuta)",
    audience: "terapeuta",
    tier: "essential",
    params: [NAME("Nombre del terapeuta"), OTHER("Nombre del paciente"), WHEN()],
    body:
      "Hola {{1}}, {{2}} solicitó una cita contigo para {{3}}. Confírmala o recházala en lemy.mx/dashboard (tienes 24 horas).",
  },
  {
    name: "lemy_appointment_requested_patient",
    label: "Recibimos tu solicitud (al paciente)",
    audience: "paciente",
    tier: "full",
    params: [NAME("Nombre del paciente"), OTHER("Nombre del terapeuta"), WHEN()],
    body:
      "Hola {{1}}, recibimos tu solicitud de cita con {{2}} para {{3}}. Te avisaremos en cuanto la confirme.",
  },
  {
    name: "lemy_appointment_confirmed",
    label: "Cita confirmada",
    audience: "ambos",
    tier: "essential",
    params: [NAME("Nombre de quien recibe"), OTHER("Nombre de la otra persona"), WHEN()],
    body: "Hola {{1}}, tu cita con {{2}} para {{3}} quedó confirmada. Detalles en lemy.mx/dashboard.",
  },
  {
    name: "lemy_appointment_cancelled",
    label: "Cita cancelada",
    audience: "ambos",
    tier: "essential",
    params: [NAME("Nombre de quien recibe"), OTHER("Nombre de la otra persona"), WHEN()],
    body: "Hola {{1}}, la cita con {{2}} para {{3}} fue cancelada. Puedes ver el detalle en lemy.mx/dashboard.",
  },
  {
    name: "lemy_appointment_rescheduled",
    label: "Cita reprogramada",
    audience: "ambos",
    tier: "essential",
    params: [NAME("Nombre de quien recibe"), OTHER("Nombre de la otra persona"), WHEN("Nueva fecha y hora")],
    body: "Hola {{1}}, {{2}} movió la cita a un nuevo horario: {{3}}. Detalles en lemy.mx/dashboard.",
  },
  {
    name: "lemy_appointment_proposed_patient",
    label: "Tu terapeuta te propuso una cita",
    audience: "paciente",
    tier: "full",
    params: [NAME("Nombre del paciente"), OTHER("Nombre del terapeuta"), WHEN()],
    body:
      "Hola {{1}}, {{2}} te propuso una cita para {{3}}. Tienes 24 horas para aceptarla o rechazarla en lemy.mx/dashboard.",
  },
  {
    name: "lemy_appointment_accepted_therapist",
    label: "El paciente aceptó tu propuesta",
    audience: "terapeuta",
    tier: "essential",
    params: [NAME("Nombre del terapeuta"), OTHER("Nombre del paciente"), WHEN()],
    body: "Hola {{1}}, {{2}} aceptó la cita que le propusiste para {{3}}. Ya quedó en tu agenda.",
  },

  // ── Vencimientos (cuando nadie responde a tiempo) ──
  {
    name: "lemy_appointment_proposal_expired",
    label: "Tu propuesta de cita venció",
    audience: "terapeuta",
    tier: "essential",
    params: [NAME("Nombre del terapeuta"), OTHER("Nombre del paciente"), WHEN()],
    body:
      "Hola {{1}}, {{2}} no respondió a tiempo a la cita que le propusiste para {{3}}. Se canceló y el horario quedó libre otra vez.",
  },
  {
    name: "lemy_appointment_confirmation_expired_patient",
    label: "Tu solicitud se canceló por falta de confirmación",
    audience: "paciente",
    tier: "full",
    params: [NAME("Nombre del paciente"), OTHER("Nombre del terapeuta"), WHEN()],
    body:
      "Hola {{1}}, {{2}} no alcanzó a confirmar tu cita del {{3}}, así que se canceló. Puedes elegir otro horario en lemy.mx/buscar.",
  },
  {
    name: "lemy_appointment_confirmation_expired_therapist",
    label: "Una solicitud se canceló sin tu confirmación",
    audience: "terapeuta",
    tier: "essential",
    params: [NAME("Nombre del terapeuta"), OTHER("Nombre del paciente"), WHEN()],
    body:
      "Hola {{1}}, la cita con {{2}} para {{3}} no se confirmó dentro de las 24 horas y se canceló sola. El horario quedó libre.",
  },

  // ── Pagos con tarjeta ──
  {
    name: "lemy_appointment_payment_reminder",
    label: "¿Qué pasó con tu pago?",
    audience: "paciente",
    tier: "full",
    params: [NAME("Nombre del paciente"), OTHER("Nombre del terapeuta"), WHEN()],
    body:
      "Hola {{1}}, tu cita con {{2}} para {{3}} aún no tiene el pago completo. Tienes unos minutos más para terminarlo en lemy.mx/dashboard antes de que se libere el horario.",
  },
  {
    name: "lemy_appointment_payment_abandoned",
    label: "Se liberó el horario por falta de pago",
    audience: "paciente",
    tier: "full",
    params: [NAME("Nombre del paciente"), OTHER("Nombre del terapeuta"), WHEN()],
    body:
      "Hola {{1}}, como no se completó el pago de tu cita con {{2}} para {{3}}, liberamos el horario. Puedes volver a reservar en lemy.mx/buscar.",
  },
];

// Mensaje libre: solo para envío MANUAL por wa.me (no existe como plantilla de
// Meta). Útil para atender a alguien en lo que dura la fase beta.
export const WA_FREE_TEMPLATE_NAME = "__libre__";

// Nota que se agrega al final de los mensajes manuales durante la beta.
export const WA_BETA_NOTE =
  "(Estamos probando los avisos de Lemy por WhatsApp. Si prefieres no recibirlos, responde BAJA.)";

// Rellena {{1}}, {{2}}… con los valores dados (índice 0 = {{1}}).
export function fillTemplate(body: string, values: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const v = values[Number(n) - 1];
    return v && v.trim() ? v.trim() : `{{${n}}}`;
  });
}

// Teléfono a formato de wa.me: solo dígitos, con 52 si son 10 dígitos
// (mismo criterio que normalizePhone del motor de notificaciones).
export function waDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

export function waLink(phone: string | null | undefined, message: string): string | null {
  const d = waDigits(phone);
  if (!d) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

// Lista de beneficios de cada plan — una sola fuente de verdad para no
// tener el copy duplicado (y potencialmente desincronizado) entre
// /dashboard/suscripcion y el correo de bienvenida para terapeutas.
//
// Cada beneficio trae "detail": el texto que se muestra al hacer click /
// tap sobre el beneficio en /dashboard/suscripcion (ver PlanFeatureItem).
// SON BORRADORES escritos por Claude como punto de partida — Gustavo dijo
// que los va a corregir después de verlos publicados, así que no se deben
// tratar como copy final todavía.
export type PlanFeature = {
  label: string;
  detail: string;
};

// Único punto de verdad para decidir si un terapeuta tiene acceso a
// cobro con tarjeta vía Stripe Connect — beneficio exclusivo del plan
// Gestiona ("plus"). Se usa tanto para bloquear la conexión/activación en
// /dashboard/pagos como para la disponibilidad real que ve el paciente al
// reservar (lib/appointments.ts y [slug]/page.tsx). subscription_status
// debe ser "active" (no basta con estar en periodo de prueba) porque el
// plan solo queda fijado en subscription_plan cuando el pago se completa
// de verdad (ver stripe/webhook/route.ts).
export function hasGestionaPlan(plan: string | null | undefined, status: string | null | undefined) {
  return plan === "plus" && status === "active";
}

export const PLAN_FEATURES_BASE: PlanFeature[] = [
  {
    label: "Presencia en el directorio de Lemy, donde te encuentran tus pacientes",
    detail:
      "Tu perfil aparece en el buscador público de Lemy y en los resultados del test de afinidad, filtrable por especialidad, enfoque y modalidad.",
  },
  {
    label: "Insignia de perfil verificado (sube tu cédula, título e identificación oficial)",
    detail:
      "Subes tus documentos una sola vez; el equipo de Lemy los revisa y, si todo checa, tu perfil muestra el distintivo \"Cédula verificada\" — genera más confianza con quien te encuentra.",
  },
  {
    label: "Recibe solicitudes de consulta de pacientes nuevos",
    detail:
      "Cuando alguien agenda contigo desde tu perfil público, te llega la notificación al instante para que la confirmes desde tu panel.",
  },
  {
    label: "Tu propia página pública tipo \"link en bio\", lista para compartir en redes",
    detail:
      "lemy.mx/tu-nombre — un perfil profesional que puedes compartir directo en tus redes o WhatsApp, con botón de \"Compartir perfil\" incluido.",
  },
  {
    label: "Conexión con Google Calendar (el evento se crea solo)",
    detail:
      "Al confirmar una cita, Lemy crea el evento en tu Google Calendar con el link de Google Meet listo, sin que tengas que hacerlo a mano.",
  },
  {
    label: "Apareces como recomendación en el test de afinidad",
    detail:
      "El cuestionario que responden los pacientes que no saben con quién empezar te puede recomendar a ti según tu especialidad y enfoque.",
  },
  {
    label: "Reseñas y calificación pública de tus pacientes",
    detail:
      "Tus pacientes pueden dejarte una calificación visible en tu perfil — ayuda a que quien no te conoce todavía confíe en agendar contigo.",
  },
  {
    label: "Historial de consultas y notas de sesión por paciente",
    detail:
      "Un espacio privado por paciente donde puedes llevar tus propias notas de seguimiento entre sesión y sesión.",
  },
  {
    label: "Recordatorios automáticos de citas por correo",
    detail:
      "Tanto tú como tu paciente reciben un recordatorio por correo antes de cada sesión, para bajar las inasistencias.",
  },
  {
    label:
      "Panel de administración: pacientes, horarios, tarifas, tu perfil, y un resumen mensual de tus ingresos y consultas",
    detail:
      "Todo lo que necesitas para administrar tu práctica en un solo lugar: tu agenda, tus pacientes, tus tarifas, y un resumen de cómo te fue cada mes.",
  },
];

export const PLAN_FEATURES_PLUS: PlanFeature[] = [
  {
    label: "Todo lo del plan Empieza, más:",
    detail: "El plan Gestiona incluye todos los beneficios de Empieza, más lo siguiente.",
  },
  {
    label: "Expediente clínico digital completo: notas de evolución, consentimientos informados y carga de documentos",
    detail:
      "Un expediente estructurado por paciente — notas de evolución sesión por sesión, consentimientos informados firmables, y espacio para subir documentos clínicos.",
  },
  {
    label: "Edita tus citas directo desde Google Calendar",
    detail:
      "Los cambios que hagas en el evento desde tu Google Calendar (hora, notas) se reflejan de vuelta en Lemy, no solo al revés.",
  },
  {
    label: "Cobra tus consultas en línea, directo a tu cuenta",
    detail:
      "Conecta tu cuenta de Stripe y tus pacientes pueden pagar la consulta con tarjeta al agendar — el dinero llega directo a ti, Lemy solo cobra una comisión pequeña por transacción.",
  },
  {
    label: "Recordatorios de citas por WhatsApp",
    detail:
      "Además del correo, tú y tu paciente reciben un recordatorio por WhatsApp antes de cada sesión.",
  },
];

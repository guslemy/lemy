// Política de cancelación de Lemy para citas pagadas con tarjeta.
//
// Regla (acordada con Gustavo, 2026-11-22):
//  - Si el terapeuta cancela: reembolso completo y automático.
//  - Si el paciente cancela con 24 horas o más de anticipación: reembolso completo.
//  - Con menos de 24 horas, o inasistencia: sin reembolso automático.
//  - Si el terapeuta sube su PROPIA política (booking_policy_url), esta política
//    de Lemy NO aplica ni se automatiza nada: el terapeuta reembolsa a mano.
//
// Las citas en efectivo no se reembolsan por Lemy (el dinero nunca pasó por
// la plataforma).

export const LEMY_CANCELLATION_HOURS = 24;

// Límite de seguridad para reembolsar desde Lemy: Stripe/los bancos limitan
// cuánto tiempo después se puede devolver un cargo de tarjeta.
export const AUTO_REFUND_MAX_DAYS = 90;

// Botón manual "Reembolsar" del terapeuta: hasta 1 semana después de la fecha
// de la consulta (pedido de Gustavo, 2026-11-22). Pasado ese plazo, el
// terapeuta lo hace directo en su Stripe.
export const MANUAL_REFUND_AFTER_SESSION_DAYS = 7;

// ¿Aplica la política de Lemy? Solo si el terapeuta no cargó la suya.
export function lemyPolicyApplies(bookingPolicyUrl: string | null | undefined): boolean {
  return !bookingPolicyUrl || !bookingPolicyUrl.trim();
}

// Texto corto para el perfil público y los recibos.
export const LEMY_POLICY_SHORT =
  `Cancelaciones (pagos con tarjeta): si cancelas con ${LEMY_CANCELLATION_HOURS} horas o más de anticipación, te reembolsamos el pago completo. ` +
  `Con menos tiempo no hay reembolso. Si tu terapeuta cancela, el reembolso es completo y automático.`;

// ¿Corresponde reembolso automático según la política de Lemy?
export function shouldAutoRefund(params: {
  cancelledBy: "patient" | "therapist";
  scheduledAtIso: string;
  nowMs?: number;
}): boolean {
  if (params.cancelledBy === "therapist") return true;
  const now = params.nowMs ?? Date.now();
  const hoursBefore = (new Date(params.scheduledAtIso).getTime() - now) / (60 * 60 * 1000);
  return hoursBefore >= LEMY_CANCELLATION_HOURS;
}

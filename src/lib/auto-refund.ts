import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import {
  AUTO_REFUND_MAX_DAYS,
  lemyPolicyApplies,
  shouldAutoRefund,
} from "@/lib/cancellation-policy";

// Reembolso automático al cancelar una cita pagada con tarjeta, según la
// política de Lemy (ver lib/cancellation-policy.ts). Solo aplica si el
// terapeuta NO cargó su propia política. Pide el reembolso a Stripe en la
// cuenta conectada del terapeuta (Direct charge) y devuelve también la
// comisión de Lemy. El aviso a paciente y terapeuta y la actualización del
// tablero los hace el webhook (charge.refunded, ver card-payments.ts).
//
// Nunca lanza: si algo falla, la cancelación ya se hizo y el terapeuta puede
// reembolsar a mano. Idempotente (misma cita = mismo reembolso).
export async function maybeAutoRefundOnCancel(params: {
  appointmentId: string;
  cancelledBy: "patient" | "therapist";
}): Promise<"refunded" | "skipped" | "failed"> {
  try {
    const supabase = createServiceClient();

    const { data: payment } = await supabase
      .from("card_payments")
      .select("therapist_id, stripe_payment_intent_id, status, refunded_cents, paid_at")
      .eq("appointment_id", params.appointmentId)
      .maybeSingle();
    if (!payment || !payment.stripe_payment_intent_id) return "skipped";
    if (payment.status === "refunded" || (payment.refunded_cents as number) > 0) return "skipped";

    const ageDays = (Date.now() - new Date(payment.paid_at as string).getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays > AUTO_REFUND_MAX_DAYS) return "skipped";

    const { data: therapist } = await supabase
      .from("therapists")
      .select("stripe_connect_account_id, booking_policy_url")
      .eq("id", payment.therapist_id)
      .maybeSingle();
    if (!therapist?.stripe_connect_account_id) return "skipped";

    // Política propia del terapeuta: se desactiva la automatización.
    if (!lemyPolicyApplies(therapist.booking_policy_url as string | null)) return "skipped";

    const { data: appointment } = await supabase
      .from("appointments")
      .select("scheduled_at")
      .eq("id", params.appointmentId)
      .maybeSingle();
    if (!appointment) return "skipped";

    // Una consulta que ya comenzó no se cancela, así que tampoco se reembolsa
    // sola; para eso está el botón manual "Reembolsar" (hasta 1 semana después).
    if (new Date(appointment.scheduled_at as string).getTime() <= Date.now()) return "skipped";

    if (!shouldAutoRefund({ cancelledBy: params.cancelledBy, scheduledAtIso: appointment.scheduled_at as string })) {
      return "skipped";
    }

    await getStripe().refunds.create(
      {
        payment_intent: payment.stripe_payment_intent_id as string,
        refund_application_fee: true,
        reason: "requested_by_customer",
        metadata: { lemy_kind: "auto_refund_on_cancel", appointment_id: params.appointmentId, cancelled_by: params.cancelledBy },
      },
      {
        stripeAccount: therapist.stripe_connect_account_id as string,
        idempotencyKey: `lemy-auto-refund-${params.appointmentId}`,
      }
    );
    return "refunded";
  } catch (err) {
    console.error(`Error en reembolso automático de la cita ${params.appointmentId}:`, err);
    return "failed";
  }
}

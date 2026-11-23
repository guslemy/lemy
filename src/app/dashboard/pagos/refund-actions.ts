"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { AUTO_REFUND_MAX_DAYS, MANUAL_REFUND_AFTER_SESSION_DAYS } from "@/lib/cancellation-policy";

export type RefundResult = { ok: true } | { ok: false; error: string };

// Botón "Reembolsar" del terapeuta (tablero Pagos con tarjeta). Devuelve el
// pago completo al paciente, incluida la comisión de Lemy, hasta 1 semana
// después de la fecha de la consulta. El cambio de estado en el tablero y los
// avisos a paciente y terapeuta los hace el webhook (charge.refunded).
export async function refundCardPayment(appointmentId: string): Promise<RefundResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Inicia sesión de nuevo." };

    const service = createServiceClient();
    const { data: payment } = await service
      .from("card_payments")
      .select("therapist_id, stripe_payment_intent_id, status, refunded_cents, paid_at")
      .eq("appointment_id", appointmentId)
      .maybeSingle();
    // Solo el terapeuta dueño del cobro.
    if (!payment || payment.therapist_id !== user.id) return { ok: false, error: "No encontramos ese pago." };

    if (payment.status === "refunded" || (payment.refunded_cents as number) > 0) {
      return { ok: false, error: "Este pago ya fue reembolsado." };
    }
    if (!payment.stripe_payment_intent_id) {
      return { ok: false, error: "Este pago es anterior al sistema de reembolsos. Reembólsalo desde tu panel de Stripe." };
    }

    const { data: appointment } = await service
      .from("appointments")
      .select("scheduled_at")
      .eq("id", appointmentId)
      .maybeSingle();
    if (!appointment) return { ok: false, error: "No encontramos la cita." };

    const msAfter = Date.now() - new Date(appointment.scheduled_at as string).getTime();
    if (msAfter > MANUAL_REFUND_AFTER_SESSION_DAYS * 24 * 60 * 60 * 1000) {
      return { ok: false, error: "Ya pasó más de una semana desde la consulta. Reembólsalo desde tu panel de Stripe." };
    }
    const ageDays = (Date.now() - new Date(payment.paid_at as string).getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays > AUTO_REFUND_MAX_DAYS) {
      return { ok: false, error: "El pago es demasiado antiguo para reembolsarse desde Lemy. Hazlo desde tu panel de Stripe." };
    }

    const { data: therapist } = await service
      .from("therapists")
      .select("stripe_connect_account_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!therapist?.stripe_connect_account_id) return { ok: false, error: "No encontramos tu cuenta de Stripe." };

    await getStripe().refunds.create(
      {
        payment_intent: payment.stripe_payment_intent_id as string,
        refund_application_fee: true,
        reason: "requested_by_customer",
        metadata: { lemy_kind: "manual_refund", appointment_id: appointmentId },
      },
      {
        stripeAccount: therapist.stripe_connect_account_id as string,
        idempotencyKey: `lemy-manual-refund-${appointmentId}`,
      }
    );

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error(`Error al reembolsar el pago de la cita ${appointmentId}:`, err);
    return { ok: false, error: "No pudimos hacer el reembolso. Intenta de nuevo o hazlo desde tu panel de Stripe." };
  }
}

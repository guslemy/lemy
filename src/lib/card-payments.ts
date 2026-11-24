import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { LEMY_POLICY_SHORT, lemyPolicyApplies } from "@/lib/cancellation-policy";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatch, emailOf } from "@/lib/notifications/engine";
import { whenLabelFor } from "@/lib/notifications/instant";
import {
  cardPaymentReceiptPatient,
  cardPaymentReceivedTherapist,
  cardPayoutFailedTherapist,
  cardRefundPatient,
  cardRefundTherapist,
  formatMxn,
} from "@/lib/notifications/payment-templates";

// Registro y seguimiento de los pagos con tarjeta (Stripe Connect). Lo llama
// el webhook de Connect (api/stripe/webhook-connect). Todo aquí es "mejor
// esfuerzo": si algo falla se registra en consola pero NUNCA debe tumbar la
// confirmación de la cita ni hacer que Stripe reintente el webhook.

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
};

// Completa el desglose real (comisión de Stripe, neto, fecha estimada y id del
// pago) de un cobro que quedó sin él — por ejemplo uno registrado a mano antes
// de existir el webhook. Lo consulta a Stripe por el id del cargo. Mejor
// esfuerzo: si falla devuelve false y no cambia nada.
export async function refreshCardPaymentBreakdown(appointmentId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const { data: p } = await supabase
      .from("card_payments")
      .select("therapist_id, stripe_charge_id, stripe_payment_intent_id, net_cents")
      .eq("appointment_id", appointmentId)
      .maybeSingle();
    if (!p?.stripe_charge_id) return false;

    const { data: t } = await supabase
      .from("therapists")
      .select("stripe_connect_account_id")
      .eq("id", p.therapist_id)
      .maybeSingle();
    const accountId = t?.stripe_connect_account_id as string | null | undefined;
    if (!accountId) return false;

    const charge = await getStripe().charges.retrieve(
      p.stripe_charge_id as string,
      { expand: ["balance_transaction"] },
      { stripeAccount: accountId }
    );
    const bt = charge.balance_transaction && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
    if (!bt) return false;

    const details = bt.fee_details ?? [];
    const stripePart = details.filter((d) => d.type === "stripe_fee").reduce((s, d) => s + d.amount, 0);
    const appPart = details.filter((d) => d.type === "application_fee").reduce((s, d) => s + d.amount, 0);
    const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
    const card = charge.payment_method_details?.card;

    const update: Record<string, unknown> = {
      stripe_fee_cents: stripePart,
      net_cents: bt.net,
      expected_available_on: new Date(bt.available_on * 1000).toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };
    if (appPart > 0) update.lemy_fee_cents = appPart;
    if (!p.stripe_payment_intent_id && piId) update.stripe_payment_intent_id = piId;
    if (card?.brand) update.card_brand = card.brand;
    if (card?.last4) update.card_last4 = card.last4;

    const { error } = await supabase.from("card_payments").update(update).eq("appointment_id", appointmentId);
    return !error;
  } catch (err) {
    console.error(`No se pudo completar el desglose del pago de la cita ${appointmentId}:`, err);
    return false;
  }
}

// Guarda el cobro de una cita pagada (checkout.session.completed) con el
// desglose real de Stripe, y manda el recibo al paciente y el aviso al
// terapeuta. Es idempotente: si Stripe reenvía el evento, no se duplica nada.
export async function recordCardPayment(params: {
  appointmentId: string;
  session: Stripe.Checkout.Session;
  connectedAccountId?: string;
}) {
  try {
    const { appointmentId, session } = params;
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("card_payments")
      .select("appointment_id")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, therapist_id, patient_id, price, scheduled_at, application_fee_cents")
      .eq("id", appointmentId)
      .maybeSingle();
    if (!appointment) return;

    if (!existing) {
      let accountId = params.connectedAccountId;
      if (!accountId) {
        const { data: t } = await supabase
          .from("therapists")
          .select("stripe_connect_account_id")
          .eq("id", appointment.therapist_id)
          .maybeSingle();
        accountId = (t?.stripe_connect_account_id as string | null) ?? undefined;
      }

      const amountCents = session.amount_total ?? Math.round((Number(appointment.price) || 0) * 100);
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

      let chargeId: string | null = null;
      let brand: string | null = null;
      let last4: string | null = null;
      let stripeFeeCents: number | null = null;
      let lemyFeeCents: number = (appointment.application_fee_cents as number | null) ?? 0;
      let netCents: number | null = null;
      let availableOn: string | null = null;

      // Desglose real (comisiones y fecha estimada) desde Stripe. Si falla,
      // se guarda igual el cobro con lo que ya sabemos y esos campos quedan
      // vacíos ("por confirmar" en el tablero).
      if (paymentIntentId && accountId) {
        try {
          const pi = await getStripe().paymentIntents.retrieve(
            paymentIntentId,
            { expand: ["latest_charge.balance_transaction"] },
            { stripeAccount: accountId }
          );
          const charge = pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
          if (charge) {
            chargeId = charge.id;
            const card = charge.payment_method_details?.card;
            brand = card?.brand ?? null;
            last4 = card?.last4 ?? null;
            const bt =
              charge.balance_transaction && typeof charge.balance_transaction === "object"
                ? charge.balance_transaction
                : null;
            if (bt) {
              netCents = bt.net;
              availableOn = new Date(bt.available_on * 1000).toISOString().slice(0, 10);
              const details = bt.fee_details ?? [];
              const stripePart = details.filter((d) => d.type === "stripe_fee").reduce((s, d) => s + d.amount, 0);
              const appPart = details.filter((d) => d.type === "application_fee").reduce((s, d) => s + d.amount, 0);
              stripeFeeCents = stripePart;
              if (appPart > 0) lemyFeeCents = appPart;
            }
          }
        } catch (err) {
          console.error(`No se pudo leer el desglose del pago de la cita ${appointmentId} en Stripe:`, err);
        }
      }

      const { error } = await supabase.from("card_payments").upsert(
        {
          appointment_id: appointmentId,
          therapist_id: appointment.therapist_id,
          patient_id: appointment.patient_id,
          amount_cents: amountCents,
          lemy_fee_cents: lemyFeeCents,
          stripe_fee_cents: stripeFeeCents,
          net_cents: netCents,
          card_brand: brand,
          card_last4: last4,
          stripe_payment_intent_id: paymentIntentId,
          stripe_charge_id: chargeId,
          expected_available_on: availableOn,
          paid_at: new Date().toISOString(),
          status: "paid",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "appointment_id", ignoreDuplicates: true }
      );
      if (error) {
        console.error(`Error guardando el cobro de la cita ${appointmentId}:`, error);
        return;
      }
    }

    await notifyCardPayment(appointmentId);
  } catch (err) {
    console.error("Error registrando pago con tarjeta:", err);
  }
}

// Recibo al paciente + aviso al terapeuta. dispatch() ya evita duplicados por
// (tipo, cita), así que llamarla dos veces no manda dos correos.
async function notifyCardPayment(appointmentId: string) {
  try {
    const supabase = createServiceClient();
    const { data: payment } = await supabase
      .from("card_payments")
      .select("*")
      .eq("appointment_id", appointmentId)
      .maybeSingle();
    if (!payment) return;

    const { data: appointment } = await supabase
      .from("appointments")
      .select("scheduled_at")
      .eq("id", appointmentId)
      .maybeSingle();
    if (!appointment) return;

    const [{ data: therapistRow }, { data: patientProfile }, therapistEmail, patientEmail] = await Promise.all([
      supabase.from("therapists").select("display_name, booking_policy_url").eq("id", payment.therapist_id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", payment.patient_id).maybeSingle(),
      emailOf(supabase, payment.therapist_id as string),
      emailOf(supabase, payment.patient_id as string),
    ]);

    const therapistName = (therapistRow?.display_name as string | undefined) ?? "tu terapeuta";
    const patientName = (patientProfile?.full_name as string | undefined) ?? "tu paciente";
    const whenLabel = whenLabelFor(appointment.scheduled_at as string);
    const policyText = lemyPolicyApplies(therapistRow?.booking_policy_url as string | null) ? LEMY_POLICY_SHORT : null;
    const brand = payment.card_brand ? (BRAND_LABEL[payment.card_brand as string] ?? String(payment.card_brand)) : null;
    const cardLabel = payment.card_last4 ? `${brand ?? "Tarjeta"} •••• ${payment.card_last4}` : null;

    const receipt = cardPaymentReceiptPatient({
      patientName,
      therapistName,
      whenLabel,
      amountCents: payment.amount_cents as number,
      paidAtIso: payment.paid_at as string,
      cardLabel,
      reference: appointmentId.slice(0, 8).toUpperCase(),
      policyText,
    });
    await dispatch({
      supabase,
      type: "card_payment_receipt_patient",
      relatedId: appointmentId,
      recipientId: payment.patient_id as string,
      email: patientEmail,
      phone: null,
      subject: receipt.subject,
      html: receipt.html,
      emailOnly: true, // sin WhatsApp a propósito: el recibo va por correo
    });

    const forTherapist = cardPaymentReceivedTherapist({
      therapistName,
      patientName,
      whenLabel,
      amountCents: payment.amount_cents as number,
      lemyFeeCents: payment.lemy_fee_cents as number,
      stripeFeeCents: (payment.stripe_fee_cents as number | null) ?? null,
      netCents: (payment.net_cents as number | null) ?? null,
      expectedAvailableOn: (payment.expected_available_on as string | null) ?? null,
    });
    await dispatch({
      supabase,
      type: "card_payment_received_therapist",
      relatedId: appointmentId,
      recipientId: payment.therapist_id as string,
      email: therapistEmail,
      phone: null,
      subject: forTherapist.subject,
      html: forTherapist.html,
      emailOnly: true,
      push: {
        title: "Pago recibido",
        body: `${patientName} pagó ${formatMxn(payment.amount_cents as number)} por su cita del ${whenLabel}.`,
        url: "/dashboard?tab=pagos",
      },
    });
  } catch (err) {
    console.error("Error notificando pago con tarjeta:", err);
  }
}

// charge.refunded — Stripe devolvió dinero (total o parcial) al paciente, ya
// sea por un reembolso hecho a mano en Stripe o por Lemy. Actualiza el
// tablero y avisa por correo a ambos. Idempotente: el aviso se identifica por
// cita + importe reembolsado, así que un reenvío del evento no duplica correos.
export async function markChargeRefunded(charge: Stripe.Charge) {
  try {
    const supabase = createServiceClient();
    const { data: payment } = await supabase
      .from("card_payments")
      .select("*")
      .eq("stripe_charge_id", charge.id)
      .maybeSingle();
    if (!payment) return;

    const refundedCents = charge.amount_refunded ?? 0;
    if (refundedCents <= 0) return;
    const full = Boolean(charge.refunded) || refundedCents >= (payment.amount_cents as number);

    await supabase
      .from("card_payments")
      .update({
        refunded_cents: refundedCents,
        refunded_at: new Date().toISOString(),
        ...(full ? { status: "refunded" } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("appointment_id", payment.appointment_id);

    if (full) {
      await supabase.from("appointments").update({ payment_status: "refunded" }).eq("id", payment.appointment_id);
    }

    const { data: appointment } = await supabase
      .from("appointments")
      .select("scheduled_at")
      .eq("id", payment.appointment_id)
      .maybeSingle();
    if (!appointment) return;

    const [{ data: therapistRow }, { data: patientProfile }, therapistEmail, patientEmail] = await Promise.all([
      supabase.from("therapists").select("display_name").eq("id", payment.therapist_id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", payment.patient_id).maybeSingle(),
      emailOf(supabase, payment.therapist_id as string),
      emailOf(supabase, payment.patient_id as string),
    ]);
    const therapistName = (therapistRow?.display_name as string | undefined) ?? "tu terapeuta";
    const patientName = (patientProfile?.full_name as string | undefined) ?? "tu paciente";
    const whenLabel = whenLabelFor(appointment.scheduled_at as string);
    const relatedId = `${payment.appointment_id}-${refundedCents}`;

    const forPatient = cardRefundPatient({ patientName, therapistName, whenLabel, refundedCents, full });
    await dispatch({
      supabase,
      type: "card_refund_patient",
      relatedId,
      recipientId: payment.patient_id as string,
      email: patientEmail,
      phone: null,
      subject: forPatient.subject,
      html: forPatient.html,
      emailOnly: true,
    });

    const forTherapist = cardRefundTherapist({ therapistName, patientName, whenLabel, refundedCents, full });
    await dispatch({
      supabase,
      type: "card_refund_therapist",
      relatedId,
      recipientId: payment.therapist_id as string,
      email: therapistEmail,
      phone: null,
      subject: forTherapist.subject,
      html: forTherapist.html,
      emailOnly: true,
      push: {
        title: "Se reembolsó un pago",
        body: `${patientName}: ${formatMxn(refundedCents)} (cita del ${whenLabel}).`,
        url: "/dashboard?tab=pagos",
      },
    });
  } catch (err) {
    console.error("Error procesando reembolso de Stripe:", err);
  }
}

// Ids de cobro (ch_...) incluidos en un depósito (payout) de Stripe.
async function chargeIdsInPayout(payoutId: string, accountId: string): Promise<string[]> {
  const ids: string[] = [];
  const list = getStripe().balanceTransactions.list({ payout: payoutId, limit: 100 }, { stripeAccount: accountId });
  for await (const bt of list) {
    if ((bt.type === "charge" || bt.type === "payment") && bt.source) {
      ids.push(typeof bt.source === "string" ? bt.source : bt.source.id);
    }
  }
  return ids;
}

// payout.paid — Stripe ya depositó en el banco del terapeuta.
export async function markPayoutPaid(payout: Stripe.Payout, accountId: string) {
  try {
    const supabase = createServiceClient();
    const chargeIds = await chargeIdsInPayout(payout.id, accountId);
    if (chargeIds.length === 0) return;
    await supabase
      .from("card_payments")
      .update({
        status: "deposited",
        deposited_at: new Date().toISOString(),
        stripe_payout_id: payout.id,
        updated_at: new Date().toISOString(),
      })
      .in("stripe_charge_id", chargeIds)
      .neq("status", "refunded");
  } catch (err) {
    console.error("Error marcando depósito de Stripe como pagado:", err);
  }
}

// payout.failed — el depósito no se pudo completar. Se marca y se avisa al
// terapeuta (no por WhatsApp). Si Stripe luego lo reintenta con éxito,
// payout.paid lo vuelve a "deposited".
export async function markPayoutFailed(payout: Stripe.Payout, accountId: string) {
  try {
    const supabase = createServiceClient();
    const chargeIds = await chargeIdsInPayout(payout.id, accountId).catch(() => [] as string[]);
    if (chargeIds.length > 0) {
      await supabase
        .from("card_payments")
        .update({ status: "payout_failed", stripe_payout_id: payout.id, updated_at: new Date().toISOString() })
        .in("stripe_charge_id", chargeIds)
        .neq("status", "refunded");
    }

    const { data: t } = await supabase
      .from("therapists")
      .select("id, display_name")
      .eq("stripe_connect_account_id", accountId)
      .maybeSingle();
    if (!t) return;

    const tpl = cardPayoutFailedTherapist({
      therapistName: (t.display_name as string | null) ?? "",
      amountCents: payout.amount,
    });
    await dispatch({
      supabase,
      type: "card_payout_failed_therapist",
      relatedId: payout.id,
      recipientId: t.id as string,
      email: await emailOf(supabase, t.id as string),
      phone: null,
      subject: tpl.subject,
      html: tpl.html,
      emailOnly: true,
      push: {
        title: "Un depósito de Stripe falló",
        body: "Revisa tus datos bancarios en Stripe para recibir tu pago.",
        url: "/dashboard?tab=pagos",
      },
    });
    console.error(`Depósito de Stripe fallido (${payout.id}) para el terapeuta ${t.id}`);
  } catch (err) {
    console.error("Error procesando depósito fallido de Stripe:", err);
  }
}

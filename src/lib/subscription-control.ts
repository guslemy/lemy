import { randomUUID } from "node:crypto";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatch, emailOf } from "@/lib/notifications/engine";
import { subscriptionCancelScheduled } from "@/lib/notifications/emailTemplates";

// Cancelar / reanudar la suscripción de un terapeuta SIN quitarle el acceso a
// su cuenta. La cancelación es "al final del periodo": ya pagó ese mes, así que
// conserva su plan hasta la fecha de corte y no se le vuelve a cobrar. Lo usan
// el botón del propio terapeuta (Suscripción) y el del admin.

export type SubscriptionControlResult =
  | { ok: true; endLabel: string | null }
  | { ok: false; error: "sin_suscripcion" | "stripe" };

const fmtDay = (d: Date) =>
  d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });

export async function scheduleCancelAtPeriodEnd(therapistId: string): Promise<SubscriptionControlResult> {
  const service = createServiceClient();
  const { data: t } = await service
    .from("therapists")
    .select("display_name, stripe_billing_subscription_id, subscription_current_period_end")
    .eq("id", therapistId)
    .maybeSingle();
  const subscriptionId = t?.stripe_billing_subscription_id as string | null | undefined;
  if (!subscriptionId) return { ok: false, error: "sin_suscripcion" };

  let endLabel: string | null = null;
  try {
    const sub = await getStripe().subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    if (sub.cancel_at) {
      endLabel = fmtDay(new Date(sub.cancel_at * 1000));
      await service
        .from("therapists")
        .update({ subscription_cancel_at: new Date(sub.cancel_at * 1000).toISOString() })
        .eq("id", therapistId);
    }
  } catch (err) {
    console.error(`Error programando la cancelación de la suscripción ${subscriptionId}:`, err);
    return { ok: false, error: "stripe" };
  }
  if (!endLabel && t?.subscription_current_period_end) {
    endLabel = fmtDay(new Date(t.subscription_current_period_end as string));
  }

  // Aviso por correo (mejor esfuerzo; relatedId aleatorio para que avise cada vez).
  try {
    const email = await emailOf(service, therapistId);
    const { subject, html } = subscriptionCancelScheduled({
      name: (t?.display_name as string | undefined) ?? "",
      endLabel,
    });
    await dispatch({
      supabase: service,
      type: "subscription_cancel_scheduled",
      relatedId: randomUUID(),
      recipientId: therapistId,
      email,
      phone: null,
      subject,
      html,
      emailOnly: true,
    });
  } catch (err) {
    console.error("Error mandando el aviso de cancelación de suscripción:", err);
  }

  return { ok: true, endLabel };
}

// Deshace una cancelación programada (antes de que llegue la fecha de corte).
export async function resumeSubscription(therapistId: string): Promise<SubscriptionControlResult> {
  const service = createServiceClient();
  const { data: t } = await service
    .from("therapists")
    .select("stripe_billing_subscription_id")
    .eq("id", therapistId)
    .maybeSingle();
  const subscriptionId = t?.stripe_billing_subscription_id as string | null | undefined;
  if (!subscriptionId) return { ok: false, error: "sin_suscripcion" };
  try {
    await getStripe().subscriptions.update(subscriptionId, { cancel_at_period_end: false });
    await service.from("therapists").update({ subscription_cancel_at: null }).eq("id", therapistId);
    return { ok: true, endLabel: null };
  } catch (err) {
    console.error(`Error reanudando la suscripción ${subscriptionId}:`, err);
    return { ok: false, error: "stripe" };
  }
}

// ¿Tiene una cancelación programada? (fecha de corte si la hay)
export async function getScheduledCancellation(subscriptionId: string): Promise<string | null> {
  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    if (sub.cancel_at_period_end && sub.cancel_at) return fmtDay(new Date(sub.cancel_at * 1000));
    return null;
  } catch {
    return null;
  }
}

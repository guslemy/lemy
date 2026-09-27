import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, STRIPE_COUPON_REFERRAL } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatch, emailOf } from "@/lib/notifications/engine";
import {
  subscriptionWelcome,
  subscriptionPaymentFailed,
  referralBonusGranted,
} from "@/lib/notifications/emailTemplates";

// Fuente de verdad para el estado real de la suscripción: nunca confiamos
// solo en lo que devuelve el Checkout — Stripe puede fallar un cobro, un
// terapeuta puede cancelar desde su portal, etc. Todo eso llega aquí.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Firma de webhook de Stripe inválida:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.lemy_user_id;
        const plan = session.metadata?.plan ?? null;
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
          const { data: updated } = await supabase
            .from("therapists")
            .update({
              stripe_billing_subscription_id: subscription.id,
              subscription_status: "active",
              subscription_plan: plan,
              subscription_current_period_end: currentPeriodEndIso(subscription),
            })
            .eq("id", userId)
            .select("display_name")
            .maybeSingle();

          await grantReferralBonusIfNeeded(stripe, supabase, userId);

          // Correo 2 de la secuencia de onboarding: ya pagó de verdad —
          // bienvenida ajustada al plan que eligió (con invitación a upgrade
          // solo si se quedó en Empieza).
          try {
            const email = await emailOf(supabase, userId);
            const { subject, html } = subscriptionWelcome({
              name: updated?.display_name || "ahí",
              plan: plan === "plus" ? "plus" : "base",
            });
            await dispatch({
              supabase,
              type: "subscription_welcome",
              relatedId: userId,
              recipientId: userId,
              email,
              phone: null,
              subject,
              html,
              emailOnly: true,
            });
          } catch (err) {
            console.error("Error mandando correo de bienvenida de suscripción:", err);
          }
        }
        break;
      }

      // Una suscripción creada a mano en el Dashboard de Stripe (ej. cupón
      // de empleado al 100%, ver [[project_lemy_reviews_and_stripe_gating]])
      // nunca pasa por Checkout, así que "checkout.session.completed" nunca
      // dispara para ella — sin este caso, Supabase se queda sin enterarse
      // de que existe. Requiere que quien la cree a mano le ponga
      // metadata.lemy_user_id (y metadata.plan, "base" o "plus") a la
      // suscripción; sin eso no hay forma de saber a qué fila de
      // `therapists` corresponde.
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.lemy_user_id;
        const plan = subscription.metadata?.plan ?? null;
        if (userId) {
          await supabase
            .from("therapists")
            .update({
              stripe_billing_subscription_id: subscription.id,
              subscription_status: mapStripeStatus(subscription.status),
              subscription_current_period_end: currentPeriodEndIso(subscription),
              ...(plan ? { subscription_plan: plan } : {}),
            })
            .eq("id", userId);
        }
        break;
      }

      // Antes un cobro fallido solo se reflejaba como subscription_status
      // pasando a "past_due" en la fila de therapists (via
      // customer.subscription.updated, abajo) — nadie se enteraba hasta
      // que su perfil dejaba de ser visible. A petición de Gustavo
      // (2026-09-27): avisar en el momento. relatedId = invoice.id: Stripe
      // reutiliza el mismo id en reintentos de la misma factura, así que
      // esto manda un solo correo por factura fallida, no uno por cada
      // reintento.
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // Desde la API "Basil" (2025-03-31, ver nota en currentPeriodEndIso
        // más abajo) invoice.subscription ya no existe — se movió a
        // parent.subscription_details.subscription.
        const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = invoiceSubscription ? String(invoiceSubscription) : null;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.lemy_user_id;
          if (userId) {
            const { data: therapist } = await supabase
              .from("therapists")
              .select("display_name")
              .eq("id", userId)
              .maybeSingle();
            const email = await emailOf(supabase, userId);
            const { subject, html } = subscriptionPaymentFailed({
              name: therapist?.display_name || "ahí",
              nextAttemptLabel: invoice.next_payment_attempt
                ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                  })
                : null,
            });
            await dispatch({
              supabase,
              type: "subscription_payment_failed",
              relatedId: invoice.id,
              recipientId: userId,
              email,
              phone: null,
              subject,
              html,
              emailOnly: true,
            });
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Error procesando webhook de Stripe:", err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Desde la API "Basil" de Stripe (2025-03-31), current_period_end ya no
// vive en la suscripción — se movió a cada subscription item. Lo leemos de
// ahí para poder mandar el recordatorio de renovación con la fecha correcta.
function currentPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  const unixSeconds = item?.current_period_end;
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

// Si quien acaba de activar su suscripción llegó por un link de referido
// (therapists.referred_by) y todavía no le hemos dado el bono a quien lo
// invitó, le engancha el cupón de 30% (una sola factura) a la suscripción
// del referente. Solo se dispara una vez por referido — referral_bonus_granted
// evita que se repita si cancela y se vuelve a suscribir después.
async function grantReferralBonusIfNeeded(
  stripe: Stripe,
  supabase: ReturnType<typeof createServiceClient>,
  referredUserId: string
) {
  if (!STRIPE_COUPON_REFERRAL) return;

  const { data: referred } = await supabase
    .from("therapists")
    .select("referred_by, referral_bonus_granted")
    .eq("id", referredUserId)
    .maybeSingle();

  if (!referred?.referred_by || referred.referral_bonus_granted) return;

  const { data: referrer } = await supabase
    .from("therapists")
    .select("stripe_billing_subscription_id")
    .eq("id", referred.referred_by)
    .maybeSingle();

  if (!referrer?.stripe_billing_subscription_id) return;

  await stripe.subscriptions.update(referrer.stripe_billing_subscription_id, {
    discounts: [{ coupon: STRIPE_COUPON_REFERRAL }],
  });

  await supabase
    .from("therapists")
    .update({ referral_bonus_granted: true })
    .eq("id", referredUserId);

  // Antes el cupón se aplicaba en silencio — quien refirió solo lo notaba
  // (o no) al ver su siguiente factura. A petición de Gustavo (2026-09-27).
  try {
    const [{ data: referrerRow }, { data: referredRow }, referrerEmail] = await Promise.all([
      supabase.from("therapists").select("display_name").eq("id", referred.referred_by).maybeSingle(),
      supabase.from("therapists").select("display_name").eq("id", referredUserId).maybeSingle(),
      emailOf(supabase, referred.referred_by),
    ]);
    const { subject, html } = referralBonusGranted({
      name: referrerRow?.display_name || "ahí",
      referredName: referredRow?.display_name || "Alguien que invitaste",
    });
    await dispatch({
      supabase,
      type: "referral_bonus_granted",
      relatedId: referredUserId,
      recipientId: referred.referred_by,
      email: referrerEmail,
      phone: null,
      subject,
      html,
      emailOnly: true,
    });
  } catch (err) {
    console.error("Error mandando correo de bono de referido:", err);
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "inactive";
  }
}

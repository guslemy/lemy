import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, STRIPE_COUPON_REFERRAL } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

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
          await supabase
            .from("therapists")
            .update({
              stripe_billing_subscription_id: subscription.id,
              subscription_status: "active",
              subscription_plan: plan,
              subscription_current_period_end: currentPeriodEndIso(subscription),
            })
            .eq("id", userId);

          await grantReferralBonusIfNeeded(stripe, supabase, userId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.lemy_user_id;
        if (userId) {
          await supabase
            .from("therapists")
            .update({
              subscription_status: mapStripeStatus(subscription.status),
              subscription_current_period_end: currentPeriodEndIso(subscription),
            })
            .eq("id", userId);
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

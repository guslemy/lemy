import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Fuente de verdad para el estado real de la suscripción: nunca confiamos
// solo en lo que devuelve el Checkout — Stripe puede fallar un cobro, un
// terapeuta puede cancelar desde su portal, etc. Todo eso llega aquí.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

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
          await supabase
            .from("therapists")
            .update({
              stripe_billing_subscription_id: String(session.subscription),
              subscription_status: "active",
              subscription_plan: plan,
            })
            .eq("id", userId);
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
            .update({ subscription_status: mapStripeStatus(subscription.status) })
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

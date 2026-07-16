"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe, STRIPE_PRICE_BASE, STRIPE_PRICE_PLUS, STRIPE_COUPON_FOUNDER } from "@/lib/stripe";

async function requireTherapist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "therapist") redirect("/dashboard");

  return { supabase, user };
}

async function siteUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx";
}

// Crea (o reutiliza) el Customer de Stripe del terapeuta y arranca una
// Checkout Session real en modo suscripción. Si es de los primeros 30
// fundadores, aplica el cupón de 30% x 3 meses automáticamente.
export async function createSubscriptionCheckout(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const plan = String(formData.get("plan") || "base") === "plus" ? "plus" : "base";
  const priceId = plan === "plus" ? STRIPE_PRICE_PLUS : STRIPE_PRICE_BASE;

  const { data: therapist } = await supabase
    .from("therapists")
    .select("stripe_billing_customer_id, is_founding_member, display_name")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = therapist?.stripe_billing_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: therapist?.display_name ?? undefined,
      metadata: { lemy_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("therapists")
      .update({ stripe_billing_customer_id: customerId })
      .eq("id", user.id);
  }

  const base = await siteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    discounts:
      therapist?.is_founding_member && STRIPE_COUPON_FOUNDER
        ? [{ coupon: STRIPE_COUPON_FOUNDER }]
        : undefined,
    success_url: `${base}/dashboard/suscripcion?ok=1`,
    cancel_url: `${base}/dashboard/suscripcion?cancelado=1`,
    metadata: { lemy_user_id: user.id, plan },
    subscription_data: { metadata: { lemy_user_id: user.id, plan } },
  });

  if (!session.url) redirect("/dashboard/suscripcion?error=1");
  redirect(session.url);
}

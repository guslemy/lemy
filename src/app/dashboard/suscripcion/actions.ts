"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getStripe,
  STRIPE_PRICE_BASE,
  STRIPE_PRICE_PLUS,
  STRIPE_COUPON_FOUNDER,
  STRIPE_COUPON_REFERRAL_NEW_USER,
} from "@/lib/stripe";

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
  const stripe = getStripe();
  const { supabase, user } = await requireTherapist();
  const plan = String(formData.get("plan") || "base") === "plus" ? "plus" : "base";
  const priceId = plan === "plus" ? STRIPE_PRICE_PLUS : STRIPE_PRICE_BASE;

  const { data: therapist } = await supabase
    .from("therapists")
    .select("stripe_billing_customer_id, is_founding_member, display_name, referred_by")
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

  // Stripe Checkout solo permite un descuento a la vez. Prioridad: cupón de
  // fundador (30% x3 meses + precio bloqueado 1 año) por encima del de
  // referido nuevo (30% x2 meses) — en la práctica casi no se cruzan, pero
  // si alguien es ambas cosas, se queda con el beneficio mayor.
  const discounts = therapist?.is_founding_member && STRIPE_COUPON_FOUNDER
    ? [{ coupon: STRIPE_COUPON_FOUNDER }]
    : therapist?.referred_by && STRIPE_COUPON_REFERRAL_NEW_USER
      ? [{ coupon: STRIPE_COUPON_REFERRAL_NEW_USER }]
      : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    discounts,
    success_url: `${base}/dashboard?tab=suscripcion&sus_ok=1`,
    cancel_url: `${base}/dashboard?tab=suscripcion&sus_cancelado=1`,
    metadata: { lemy_user_id: user.id, plan },
    subscription_data: { metadata: { lemy_user_id: user.id, plan } },
  });

  if (!session.url) redirect("/dashboard?tab=suscripcion&sus_error=1");
  redirect(session.url);
}

// Manda al terapeuta al Billing Portal de Stripe (hospedado por ellos) para
// que pueda cambiar de plan, actualizar su tarjeta, ver facturas o darse de
// baja por su cuenta — antes no existía ninguna forma de cancelar dentro de
// Lemy. Necesita que ya exista un Customer de Stripe (o sea, que alguna vez
// haya iniciado una suscripción); si nunca lo ha hecho, no hay nada que
// gestionar todavía.
//
// OJO para Gustavo: en modo Live, el Billing Portal necesita configurarse
// una vez desde Stripe (Settings → Billing → Customer portal → Activate)
// antes de que este botón funcione — si no, Stripe regresa un error.
export async function openBillingPortal() {
  const stripe = getStripe();
  const { supabase, user } = await requireTherapist();

  const { data: therapist } = await supabase
    .from("therapists")
    .select("stripe_billing_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!therapist?.stripe_billing_customer_id) {
    redirect("/dashboard?tab=suscripcion&sus_error=sin_suscripcion");
  }

  const base = await siteUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: therapist.stripe_billing_customer_id,
    return_url: `${base}/dashboard?tab=suscripcion`,
  });

  redirect(session.url);
}

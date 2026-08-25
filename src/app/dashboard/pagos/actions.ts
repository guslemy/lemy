"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { hasGestionaPlan } from "@/lib/plan-features";

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

// Guarda qué métodos de pago acepta el terapeuta (checkboxes en
// /dashboard/pagos). "Tarjeta" es solo la intención — [slug]/page.tsx y
// lib/appointments.ts siguen exigiendo stripe_connect_charges_enabled antes
// de ofrecérsela de verdad al paciente. Nunca se permite dejar los dos sin
// marcar: un terapeuta sin ningún método quedaría inagendable.
export async function updatePaymentMethods(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  let acceptsCard = formData.get("accepts_card_payment") === "on";
  const acceptsCash = formData.get("accepts_cash_payment") === "on";

  if (!acceptsCard && !acceptsCash) {
    redirect("/dashboard?tab=pagos&pagos_error_metodos=1");
  }

  // Cobro con tarjeta es exclusivo del plan Gestiona — si alguien sin ese
  // plan manda el checkbox marcado (formulario manipulado, o dejó de ser
  // Gestiona desde la última vez que vio la página), se ignora en vez de
  // guardarlo. No es un error bloqueante: simplemente se guarda como si no
  // lo hubiera marcado.
  if (acceptsCard) {
    const { data: therapist } = await supabase
      .from("therapists")
      .select("subscription_plan, subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    if (!hasGestionaPlan(therapist?.subscription_plan, therapist?.subscription_status)) {
      acceptsCard = false;
      if (!acceptsCash) redirect("/dashboard?tab=pagos&pagos_error_plan=1");
    }
  }

  await supabase
    .from("therapists")
    .update({ accepts_card_payment: acceptsCard, accepts_cash_payment: acceptsCash })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  redirect("/dashboard?tab=pagos&pagos_metodos_guardados=1");
}

// Crea (si hace falta) la cuenta Express de Stripe Connect del terapeuta y
// manda al Onboarding hospedado por Stripe (KYC: datos fiscales, cuenta
// bancaria, identidad). Es Stripe quien recolecta todo eso — nosotros nunca
// vemos ni tocamos esos datos. Se puede volver a llamar para reanudar un
// onboarding a medias (el mismo account id, un Account Link nuevo).
export async function connectStripeAccount() {
  const stripe = getStripe();
  const { supabase, user } = await requireTherapist();

  const { data: therapist } = await supabase
    .from("therapists")
    .select("stripe_connect_account_id, display_name, subscription_plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasGestionaPlan(therapist?.subscription_plan, therapist?.subscription_status)) {
    redirect("/dashboard?tab=pagos&pagos_error_plan=1");
  }

  let accountId = therapist?.stripe_connect_account_id ?? null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "MX",
      email: user.email ?? undefined,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { lemy_user_id: user.id },
    });
    accountId = account.id;
    await supabase
      .from("therapists")
      .update({ stripe_connect_account_id: accountId })
      .eq("id", user.id);
  }

  const base = await siteUrl();
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/dashboard?tab=pagos`,
    return_url: `${base}/dashboard?tab=pagos&pagos_return=1`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}

// Al volver del onboarding de Stripe, el webhook (account.updated) es la
// fuente de verdad — pero puede tardar unos segundos en llegar. Esto lee el
// estado directo de Stripe para que la página no muestre "no conectado" por
// un rato después de que el terapeuta ya terminó su parte.
export async function syncStripeConnectStatus() {
  const stripe = getStripe();
  const { supabase, user } = await requireTherapist();

  const { data: therapist } = await supabase
    .from("therapists")
    .select("stripe_connect_account_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!therapist?.stripe_connect_account_id) return;

  const account = await stripe.accounts.retrieve(therapist.stripe_connect_account_id);
  await supabase
    .from("therapists")
    .update({
      stripe_connect_charges_enabled: Boolean(account.charges_enabled),
      stripe_connect_details_submitted: Boolean(account.details_submitted),
    })
    .eq("id", user.id);
}

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe, calculateApplicationFeeCents } from "@/lib/stripe";

// Arranca el cobro real de una cita recién creada (status pending_payment) —
// Direct charge: la Checkout Session se crea EN la cuenta conectada del
// terapeuta ({ stripeAccount: accountId }), así que el dinero llega directo
// a él y él es quien factura. Lemy se queda con application_fee_amount.
// Se usa el service client porque esto corre justo después de crear la
// cita (antes de que el navegador del paciente haya vuelto a cargar nada
// con su propia sesión) y necesita leer datos del terapeuta sin depender
// de RLS de lectura pública.
export async function startAppointmentCheckout(appointmentId: string): Promise<string | null> {
  const stripe = getStripe();
  const supabase = createServiceClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, therapist_id, price, scheduled_at")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appointment) return null;

  const { data: therapist } = await supabase
    .from("therapists")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled, display_name, slug")
    .eq("id", appointment.therapist_id)
    .maybeSingle();

  if (!therapist?.stripe_connect_account_id || !therapist.stripe_connect_charges_enabled) {
    return null;
  }

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx";

  const priceMxn = Number(appointment.price) || 0;
  const feeCents = calculateApplicationFeeCents(priceMxn);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "mxn",
            unit_amount: Math.round(priceMxn * 100),
            product_data: {
              name: `Consulta con ${therapist.display_name}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: feeCents,
      },
      metadata: { lemy_kind: "appointment_payment", appointment_id: appointmentId },
      success_url: `${base}/gracias/${appointmentId}`,
      cancel_url: `${base}/${therapist.slug}?pago_cancelado=1#agenda`,
    },
    { stripeAccount: therapist.stripe_connect_account_id }
  );

  if (!session.url) return null;

  await supabase
    .from("appointments")
    .update({ stripe_checkout_session_id: session.id, application_fee_cents: feeCents })
    .eq("id", appointmentId);

  return session.url;
}

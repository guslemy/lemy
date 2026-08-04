import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyAppointmentRequested } from "@/lib/notifications/instant";

// Endpoint APARTE del webhook normal (api/stripe/webhook) porque los
// eventos que ocurren DENTRO de una cuenta conectada (Direct charges de
// Stripe Connect: el pago de cada cita) solo llegan si este endpoint está
// registrado en Stripe como "Connect webhook" (Dashboard → Developers →
// Webhooks → "Listen to events on Connected accounts"), con su PROPIO
// signing secret (STRIPE_CONNECT_WEBHOOK_SECRET, distinto de
// STRIPE_WEBHOOK_SECRET). Si solo se registra como webhook normal, estos
// eventos nunca llegan y ninguna cita se marcaría como pagada.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature!,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Firma de webhook de Stripe Connect inválida:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      // El terapeuta terminó (o actualizó) su onboarding de Connect —
      // reflejamos si ya puede recibir cobros de verdad.
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await supabase
          .from("therapists")
          .update({
            stripe_connect_charges_enabled: Boolean(account.charges_enabled),
            stripe_connect_details_submitted: Boolean(account.details_submitted),
          })
          .eq("stripe_connect_account_id", account.id);
        break;
      }

      // El paciente pagó su cita (Direct charge en la cuenta del
      // terapeuta). Recién aquí se le avisa al terapeuta de la solicitud —
      // antes de esto, la cita existe pero nadie fue notificado.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.lemy_kind !== "appointment_payment") break;
        const appointmentId = session.metadata?.appointment_id;
        if (!appointmentId) break;

        const { data: appointment } = await supabase
          .from("appointments")
          .update({ payment_status: "paid" })
          .eq("id", appointmentId)
          .select("id, therapist_id, patient_id, scheduled_at")
          .maybeSingle();

        if (appointment) {
          await notifyAppointmentRequested({
            appointmentId: appointment.id,
            therapistId: appointment.therapist_id,
            patientId: appointment.patient_id,
            scheduledAtIso: appointment.scheduled_at,
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Error procesando webhook de Stripe Connect:", err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { getAccessToken, deleteCalendarEvent } from "@/lib/google-calendar";

export type CancelRole = "patient" | "therapist";

export type Modality = "online" | "presencial";

export type PaymentMethod = "card" | "cash";

export type RequestAppointmentResult =
  | { ok: true; appointmentId: string; therapistId: string; needsPayment: boolean }
  | { ok: false; reason: "not_found" | "taken" | "self" };

// Lógica compartida para crear una solicitud de cita — la usan tanto
// requestAppointment (terapeuta/[slug]/actions.ts) como completar-perfil/
// actions.ts (cuando el paciente termina de registrarse y la reserva
// original queda pendiente de completarse). Vive aquí para no duplicarla.
export async function requestAppointmentForUser(
  supabase: SupabaseClient,
  userId: string,
  therapistSlug: string,
  scheduledAt: string,
  requestedModality: Modality,
  requestedPaymentMethod: PaymentMethod = "cash",
  // Servicio del catálogo elegido (migración 0031) — opcional a propósito:
  // un terapeuta que todavía no configura su catálogo de servicios sigue
  // reservable con el flujo viejo (price_min/session_duration_min).
  therapistServiceId?: string | null
): Promise<RequestAppointmentResult> {
  const { data: therapist } = await supabase
    .from("therapists")
    .select(
      "id, price_min, price_max, session_duration_min, is_online_available, is_in_person_available, stripe_connect_account_id, stripe_connect_charges_enabled, accepts_card_payment, accepts_cash_payment"
    )
    .eq("slug", therapistSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (!therapist) return { ok: false, reason: "not_found" };

  // Si viene un servicio, su precio y duración mandan sobre el flujo viejo —
  // pero se revalida que de verdad sea un servicio de ESTE terapeuta (nunca
  // confiar en un id que llega del formulario sin verificar dueño).
  let servicePrice: number | null = null;
  let serviceDurationMin: number | null = null;
  if (therapistServiceId) {
    const { data: service } = await supabase
      .from("therapist_services")
      .select("id, price, duration_min")
      .eq("id", therapistServiceId)
      .eq("therapist_id", therapist.id)
      .maybeSingle();
    if (service) {
      servicePrice = service.price as number;
      serviceDurationMin = service.duration_min as number;
    }
  }

  // Un terapeuta no puede reservar consigo mismo (con su propia cuenta de
  // paciente) — therapist.id es el mismo uuid que su fila en profiles.
  if (therapist.id === userId) return { ok: false, reason: "self" };

  // Defensa extra por si el request llega manipulado: nunca aceptar una
  // modalidad que el terapeuta no ofrece. La UI ya debería impedirlo, esto
  // es el respaldo del lado del servidor.
  let modality: Modality = requestedModality;
  if (modality === "online" && !therapist.is_online_available) {
    modality = "presencial";
  } else if (modality === "presencial" && !therapist.is_in_person_available) {
    modality = "online";
  }

  // Revalidar que el horario sigue libre (por si alguien más lo tomó justo antes)
  const { data: clash } = await supabase
    .from("appointments")
    .select("id")
    .eq("therapist_id", therapist.id)
    .eq("scheduled_at", scheduledAt)
    .neq("status", "cancelled")
    .maybeSingle();

  if (clash) return { ok: false, reason: "taken" };

  const price = servicePrice ?? therapist.price_min ?? therapist.price_max ?? 0;

  // El terapeuta elige en /dashboard/pagos qué métodos acepta
  // (accepts_card_payment / accepts_cash_payment), pero "acepta tarjeta" es
  // solo su intención — de verdad puede cobrar con tarjeta a través de Lemy
  // hasta que además tiene Stripe Connect activo. Combinamos ambas cosas
  // aquí para no confiar ciegamente en lo que mandó el formulario (el
  // paciente eligió su método en el popup de confirmación, pero la UI ya
  // debería haberle ocultado la opción que no aplica).
  const cardAvailable = Boolean(
    therapist.accepts_card_payment &&
      therapist.stripe_connect_account_id &&
      therapist.stripe_connect_charges_enabled
  );
  const cashAvailable = therapist.accepts_cash_payment !== false;

  let paymentMethod: PaymentMethod = requestedPaymentMethod;
  if (paymentMethod === "card" && !cardAvailable) {
    paymentMethod = cashAvailable ? "cash" : "card";
  } else if (paymentMethod === "cash" && !cashAvailable) {
    paymentMethod = cardAvailable ? "card" : "cash";
  }

  // Si el método que quedó es "tarjeta", se manda a Stripe Checkout (Direct
  // charge a la cuenta del terapeuta); si es "efectivo", la cita queda con
  // payment_status "efectivo" y avanza igual sin bloquear nada (ver
  // [slug]/actions.ts, que decide con needsPayment qué camino seguir
  // después de esta función).
  const needsPayment = paymentMethod === "card";

  const { data: inserted } = await supabase
    .from("appointments")
    .insert({
      therapist_id: therapist.id,
      patient_id: userId,
      scheduled_at: scheduledAt,
      duration_min: serviceDurationMin ?? therapist.session_duration_min ?? 50,
      modality,
      status: "pending_payment",
      payment_status: needsPayment ? "pending" : "efectivo",
      price,
      therapist_service_id: servicePrice !== null ? therapistServiceId : null,
    })
    .select("id")
    .single();

  if (!inserted?.id) return { ok: false, reason: "not_found" };

  // Si sí requiere pago, ya no se notifica aquí — la cita todavía no está
  // pagada. La notificación de "nueva solicitud" se dispara desde el webhook
  // de Stripe en cuanto se confirma el pago (ver api/stripe/webhook-connect/
  // route.ts), para no avisarle al terapeuta de reservas que el paciente
  // nunca llegó a pagar. Si NO requiere pago (efectivo), quien llama a esta
  // función es responsable de notificar de inmediato — ver [slug]/actions.ts.
  return { ok: true, appointmentId: inserted.id, therapistId: therapist.id, needsPayment };
}

// Cancela una cita en nombre de quien la pide, siempre y cuando esa persona
// sea de verdad uno de los dos participantes (terapeuta o paciente) — el
// filtro .eq(column, userId) hace que RLS y esta validación coincidan.
// No se puede cancelar algo que ya está cancelado o completado.
export type CancelledAppointmentInfo = {
  therapist_id: string;
  patient_id: string;
  scheduled_at: string;
};

export async function cancelAppointmentAsParticipant(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
  role: CancelRole,
  reason: string | null
): Promise<{ ok: boolean; appointment?: CancelledAppointmentInfo }> {
  const column = role === "patient" ? "patient_id" : "therapist_id";

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, status, therapist_id, patient_id, scheduled_at, google_calendar_event_id")
    .eq("id", appointmentId)
    .eq(column, userId)
    .maybeSingle();

  if (!appointment) return { ok: false };
  if (appointment.status === "cancelled" || appointment.status === "completed") {
    return { ok: false };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_by: role,
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq(column, userId);

  if (error) return { ok: false };

  // Si había un evento real en Google Calendar, lo borramos también — si
  // no, se queda fantasma ahí aunque la cita ya esté cancelada en Lemy.
  // get_google_refresh_token solo se puede llamar con el cliente de
  // servicio (revoke a public/anon/authenticated en
  // 0007_google_calendar_tokens.sql), y el calendario siempre es el del
  // terapeuta sin importar quién de los dos haya cancelado.
  const eventId = appointment.google_calendar_event_id as string | null;
  if (eventId) {
    const serviceClient = createServiceClient();
    try {
      const { data: refreshToken } = await serviceClient.rpc("get_google_refresh_token", {
        p_user_id: appointment.therapist_id,
      });
      if (refreshToken) {
        const accessToken = await getAccessToken(refreshToken);
        await deleteCalendarEvent({ accessToken, eventId });
      }
    } catch (err) {
      console.error("Error borrando el evento en Google Calendar al cancelar:", err);
      await serviceClient
        .from("therapists")
        .update({ google_calendar_connected: false })
        .eq("id", appointment.therapist_id);
    }
  }

  return {
    ok: true,
    appointment: {
      therapist_id: appointment.therapist_id as string,
      patient_id: appointment.patient_id as string,
      scheduled_at: appointment.scheduled_at as string,
    },
  };
}

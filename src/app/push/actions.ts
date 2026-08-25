"use server";

import { createClient } from "@/lib/supabase/server";

// Guarda/actualiza la suscripción push del usuario logueado. `endpoint` es
// único por navegador/dispositivo (upsert por eso) — si la misma persona
// activa notificaciones en el celular y en la laptop, quedan dos filas.
export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: "endpoint" }
    );

  return { ok: !error };
}

// Interruptor de notificaciones a nivel cuenta (no por dispositivo) — ver
// 0033_push_enabled_preference.sql. Independiente de si el navegador ya
// tiene permiso concedido o hay filas en push_subscriptions: esto solo
// decide si sendPushToUser() manda algo o no, sin tocar las suscripciones
// en sí (así que apagar y volver a prender no obliga a re-suscribirse en
// cada dispositivo).
export async function setPushEnabled(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("profiles")
    .update({ push_enabled: enabled })
    .eq("id", user.id);

  return { ok: !error };
}

// Segundo interruptor, independiente del de push (a petición explícita de
// Gustavo — apagar uno no debe apagar el otro). Ver
// 0034_email_whatsapp_enabled_preference.sql: NO afecta el ciclo de vida de
// una cita (solicitud, confirmación, cancelación, reagendado), esos siempre
// se mandan — solo gatea recordatorios, reseñas, renovación, etc. (ver
// ESSENTIAL_EMAIL_WHATSAPP_TYPES en lib/notifications/engine.ts).
export async function setEmailWhatsappEnabled(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("profiles")
    .update({ email_whatsapp_enabled: enabled })
    .eq("id", user.id);

  return { ok: !error };
}

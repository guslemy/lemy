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

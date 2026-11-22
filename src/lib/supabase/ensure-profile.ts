import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatch, emailOf } from "@/lib/notifications/engine";
import { patientWelcome } from "@/lib/notifications/emailTemplates";
import { cookies } from "next/headers";
import { ORIGEN_COOKIE, decodeOrigen, origenToProfileColumns, sanitizeOrigen } from "@/lib/origen-registro";

// Crea el registro en `profiles` la primera vez que un usuario entra,
// sin importar si vino por Google o por correo/contraseña.
export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    // Cualquier cuenta con correo @lemy.mx es del equipo — entra directo
    // como admin, sin que Gustavo tenga que ponerlo a mano en Supabase cada
    // vez que alguien nuevo del equipo se registra.
    const isLemyTeam = (user.email ?? "").toLowerCase().endsWith("@lemy.mx");
    const fullName = user.user_metadata?.full_name ?? user.email ?? "ahí";

    await supabase.from("profiles").insert({
      id: user.id,
      full_name: fullName,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      // Google normalmente no manda teléfono, pero por si algún proveedor sí
      // lo trae (o si signUp con correo/contraseña lo pasó en options.data).
      phone: user.user_metadata?.phone ?? null,
      // Solo llega en registro por correo/contraseña (ver email-auth-form.tsx)
      // — Google no pasa por ese formulario, así que a esos usuarios les
      // queda null. Insight de growth, no bloquea nada.
      how_heard_about_lemy: user.user_metadata?.how_heard_about_lemy ?? null,
      role: isLemyTeam ? "admin" : "patient", // por default paciente; therapist se activa en onboarding
    });

    // Permiso de WhatsApp aceptado en la casilla del registro por correo
    // (email-auth-form.tsx). Aparte del insert de arriba a propósito: si la
    // migración 0045 aún no está corrida, esto falla sin tumbar el registro.
    if (user.user_metadata?.whatsapp_opt_in === true) {
      await supabase
        .from("profiles")
        .update({ whatsapp_opt_in: true, whatsapp_opt_in_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    // Origen de registro (utm_*): primero lo que trae el propio registro por
    // correo (user_metadata.origen — sobrevive si la persona confirma su
    // correo desde otro dispositivo) y si no, la cookie "lemy_origen" que dejó
    // src/proxy.ts (caso Google). Aparte del insert de arriba y dentro de
    // try/catch a propósito: si la migración 0046 aún no está corrida, o
    // cookies() no está disponible, no debe tumbar el registro.
    try {
      let origen = sanitizeOrigen(user.user_metadata?.origen);
      if (!origen) {
        const cookieStore = await cookies();
        origen = decodeOrigen(cookieStore.get(ORIGEN_COOKIE)?.value);
      }
      if (origen) {
        const { error: origenError } = await supabase
          .from("profiles")
          .update(origenToProfileColumns(origen))
          .eq("id", user.id);
        if (origenError) {
          console.error("ensureProfile: no se pudo guardar el origen de registro:", origenError.message);
        }
      }
    } catch (err) {
      console.error("ensureProfile: error leyendo el origen de registro:", err);
    }

    // Bienvenida — antes solo existía para terapeutas (therapistWelcome).
    // isLemyTeam se excluye para que nadie del equipo reciba un "bienvenido
    // paciente" cada vez que alguien nuevo se registra con @lemy.mx.
    // therapist_welcome se manda aparte, cuando esa misma persona active su
    // cuenta como terapeuta (ver becomeTherapist, dashboard/actions.ts) —
    // aquí solo cubre el caso paciente. Se usa el cliente de servicio (no
    // el `supabase` recibido, que trae la sesión de la persona) porque
    // dispatch() necesita escribir en notification_log sin depender de sus
    // permisos de RLS — mismo patrón que el resto del sistema de avisos.
    if (!isLemyTeam) {
      try {
        const serviceClient = createServiceClient();
        const email = await emailOf(serviceClient, user.id);
        const { subject, html } = patientWelcome({ name: fullName });
        await dispatch({
          supabase: serviceClient,
          type: "patient_welcome",
          relatedId: user.id,
          recipientId: user.id,
          email,
          phone: null,
          subject,
          html,
          emailOnly: true,
        });
      } catch (err) {
        console.error("Error mandando correo de bienvenida a paciente:", err);
      }
    }
  }
}

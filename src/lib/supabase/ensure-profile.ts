import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatch, emailOf } from "@/lib/notifications/engine";
import { patientWelcome } from "@/lib/notifications/emailTemplates";

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

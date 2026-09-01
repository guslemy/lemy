import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureProfile } from "@/lib/supabase/ensure-profile";
import { hasCompleteProfile } from "@/lib/supabase/profile-completeness";
import { NextResponse, type NextRequest } from "next/server";

// Recibe el redirect de Google OAuth, intercambia el código por sesión
// y crea el registro en `profiles` si es la primera vez que este usuario entra.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await ensureProfile(supabase, data.user);

      // Cuenta desactivada desde /dashboard/admin (item 2 del panel de
      // admin) — no la borramos, pero tampoco la dejamos entrar.
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("deactivated_at, role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileRow?.deactivated_at) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?desactivada=1`);
      }

      // Si Google mandó un refresh token (pedimos access_type=offline +
      // prompt=consent en el login), lo guardamos cifrado en Vault para
      // poder crear eventos en su Google Calendar más adelante sin pedirle
      // que inicie sesión de nuevo. Con service_role porque la tabla/función
      // están bloqueadas incluso para el propio usuario.
      const refreshToken = data.session?.provider_refresh_token;
      if (refreshToken) {
        const serviceClient = createServiceClient();
        const { error: tokenError } = await serviceClient.rpc("save_google_refresh_token", {
          p_user_id: data.user.id,
          p_refresh_token: refreshToken,
        });
        if (tokenError) {
          console.error("No se pudo guardar el refresh token de Google:", tokenError.message);
        }
      }

      // Google casi nunca manda teléfono en el perfil de OAuth, así que
      // ensureProfile lo deja en null — sin este empujón, nadie que entra
      // por primera vez con Google ve jamás un aviso pidiéndoselo. Un
      // paciente lo alcanza a rescatar más tarde vía el gate de reservar
      // (requestAppointment → /completar-perfil), pero un terapeuta que
      // nunca reserva no tiene ningún otro momento en el que se le pida —
      // se queda con phone=null para siempre y sus pacientes/Lemy no
      // pueden contactarlo. No aplica a cuentas del equipo (admin).
      if (profileRow?.role !== "admin" && !(await hasCompleteProfile(supabase, data.user.id))) {
        return NextResponse.redirect(`${origin}/completar-perfil`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}

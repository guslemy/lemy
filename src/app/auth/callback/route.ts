import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureProfile } from "@/lib/supabase/ensure-profile";
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

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}

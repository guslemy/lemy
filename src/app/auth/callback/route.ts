import { createClient } from "@/lib/supabase/server";
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
      // TODO (cierre de Fase 1): guardar data.session.provider_refresh_token
      // en la tabla del terapeuta para poder crear eventos en su Google Calendar
      // sin pedirle que inicie sesión de nuevo.

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name ?? data.user.email,
          avatar_url: data.user.user_metadata?.avatar_url,
          role: "patient", // por default; el cambio a "therapist" se hace en onboarding
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}

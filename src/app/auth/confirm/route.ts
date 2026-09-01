import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/ensure-profile";
import { hasCompleteProfile } from "@/lib/supabase/profile-completeness";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Recibe el link que Supabase manda por correo (confirmar cuenta nueva,
// o "magic link" si algún día lo usamos) y crea la sesión + el perfil.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error && data.user) {
      await ensureProfile(supabase, data.user);

      // Red de seguridad por si el teléfono capturado en el formulario de
      // registro (email-auth-form.tsx) no llegó hasta aquí por alguna razón
      // — mismo criterio que auth/callback/route.ts para Google. Las
      // cuentas @lemy.mx entran directo como admin (ver ensureProfile) y no
      // necesitan este empujón.
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileRow?.role !== "admin" && !(await hasCompleteProfile(supabase, data.user.id))) {
        return NextResponse.redirect(`${origin}/completar-perfil`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}

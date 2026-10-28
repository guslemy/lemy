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
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  // Solo rutas internas, para que nadie use este redirect para mandar a otro sitio.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if ((token_hash && type) || code) {
    const supabase = await createClient();
    // Dos formatos de link posibles según la plantilla de correo de Supabase:
    // token_hash + type (el que arma nuestra plantilla) o `code` (el default,
    // flujo PKCE). Se aceptan los dos.
    const { data, error } =
      token_hash && type
        ? await supabase.auth.verifyOtp({ type, token_hash })
        : await supabase.auth.exchangeCodeForSession(code as string);

    if (!error && data.user) {
      await ensureProfile(supabase, data.user);

      // Recuperar contraseña: directo a elegir la nueva, sin pasar por
      // "completar perfil" (eso puede esperar a que ya haya entrado).
      if (type === "recovery" || next === "/restablecer-contrasena") {
        return NextResponse.redirect(`${origin}${next}`);
      }

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

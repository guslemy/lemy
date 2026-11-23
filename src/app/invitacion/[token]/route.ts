import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Enlace del correo de invitación a un paciente importado. Se usa un enlace
// PROPIO (en vez del de recuperación de Supabase, que caduca en poco tiempo)
// y aquí, al hacer clic, se genera uno fresco al momento y se redirige. El
// token de la invitación solo existe en el correo de esa persona.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { origin } = new URL(request.url);

  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.redirect(`${origin}/auth/error`);

  const supabase = createServiceClient();
  const { data: inv } = await supabase
    .from("patient_invitations")
    .select("id, email, status, patient_id")
    .eq("token", token)
    .maybeSingle();
  if (!inv || (inv.status !== "sent" && inv.status !== "pending")) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: inv.email as string,
  });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) return NextResponse.redirect(`${origin}/auth/error`);

  return NextResponse.redirect(
    `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashed)}&type=recovery&next=${encodeURIComponent("/restablecer-contrasena")}`
  );
}

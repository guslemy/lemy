import { NextResponse, type NextRequest } from "next/server";

// Link de referido: lemy.mx/api/ref?code=<slug-del-terapeuta-que-invita>.
// Solo guarda una cookie con el código y manda a la persona a la página
// principal — no hace falta que se registre en este mismo momento. La
// cookie la lee ensureTherapistShell cuando esa persona de verdad activa su
// cuenta de terapeuta (puede ser días después), para saber quién la invitó.
// 30 días de vigencia: tiempo de sobra para que alguien decida registrarse
// sin dejarla viva para siempre.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const response = NextResponse.redirect(`${origin}/`);
  if (code) {
    response.cookies.set("lemy_ref", code, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  return response;
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ORIGEN_COOKIE, ORIGEN_MAX_AGE_SECONDS, buildOrigenFromUrl, encodeOrigen } from "@/lib/origen-registro";

// Refresca la sesión de Supabase en cada request (necesario con @supabase/ssr)
// Renombrado de middleware.ts a proxy.ts: Next.js 16 renombró esta
// convención (https://nextjs.org/docs/messages/middleware-to-proxy).
export async function proxy(request: NextRequest) {
  // Atajo (2026-10-15): sin cookie de sesión de Supabase no hay sesión que
  // refrescar, así que se deja pasar la petición sin llamar a Supabase. Antes
  // CADA petición (robots, rastreadores, visitas sin cuenta...) hacía una
  // llamada de red a Supabase aquí, y eso sumaba CPU activa e invocaciones en
  // Vercel sin ningún beneficio. La cookie se llama `sb-<proyecto>-auth-token`
  // (a veces partida en `.0`, `.1`...).
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  // Origen de registro (2026-11-17): si la URL trae utm_* y todavía no hay
  // cookie de origen, se guarda (primera visita gana). Ver lib/origen-registro.ts.
  // Se hace aquí, antes del atajo de abajo, porque la gente que llega con un
  // utm casi nunca tiene sesión todavía.
  const origen = request.cookies.has(ORIGEN_COOKIE)
    ? null
    : buildOrigenFromUrl(request.nextUrl, request.headers.get("referer"));
  const guardarOrigen = (res: NextResponse) => {
    if (origen) {
      res.cookies.set(ORIGEN_COOKIE, encodeOrigen(origen), {
        maxAge: ORIGEN_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      });
    }
    return res;
  };

  if (!hasSessionCookie) {
    return guardarOrigen(NextResponse.next({ request }));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Importante: no eliminar esta línea, refresca el token si expiró.
  await supabase.auth.getUser();

  return guardarOrigen(supabaseResponse);
}

export const config = {
  matcher: [
    // Se excluyen también archivos estáticos que no necesitan sesión (fuentes,
    // css/js, mapas, txt/xml como robots y sitemap, manifest, video, pdf):
    // cada uno de esos pedidos era una invocación de función de más.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|otf|txt|xml|webmanifest|mp4|webm|pdf)$).*)",
  ],
};

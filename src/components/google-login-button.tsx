"use client";

import { createClient } from "@/lib/supabase/client";
import { GoogleGIcon } from "@/components/google-g-icon";

// Login con Google. El scope de Calendar SOLO se pide cuando
// includeCalendarScopes es true (quien llegó con intención explícita de ser
// terapeuta, ver /login?flujo=terapeuta) — un paciente nunca usa Calendar en
// Lemy, así que pedírselo de todos modos viola el principio de "narrowest
// scopes" que exige la verificación de Google (y contradice lo que dice
// nuestro propio aviso de privacidad: "solo si eres terapeuta"). Quien se
// vuelve terapeuta más tarde sin haber pasado por aquí lo conecta después
// desde /dashboard/perfil (ver GoogleCalendarConnectButton).
//
// `next` viaja hasta /auth/callback (que sí sabe leerlo) para que, si
// alguien llegó aquí a media reserva de cita, Google no lo mande a
// /dashboard a secas — regresa exactamente a donde iba.
export function GoogleLoginButton({
  next,
  includeCalendarScopes = false,
}: {
  next?: string;
  includeCalendarScopes?: boolean;
}) {
  const supabase = createClient();

  const handleLogin = async () => {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        // calendar.freebusy: para poder revisar si el terapeuta ya tiene algo
        // ocupado en su Google Calendar real (fuera de Lemy) antes de
        // mostrar un horario como disponible. Quien conectó su cuenta antes
        // de que agregáramos este scope necesita reconectar (cerrar sesión
        // y volver a entrar con Google) para otorgarlo.
        ...(includeCalendarScopes
          ? {
              scopes:
                "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy",
              // access_type=offline + prompt=consent son para conseguir un
              // refresh_token de Google (necesario para crear eventos desde
              // el servidor más adelante) — sin scope de Calendar de por
              // medio no hace falta pedir ninguno de los dos, así que
              // también quedan condicionados a includeCalendarScopes.
              queryParams: {
                access_type: "offline",
                prompt: "consent",
              },
            }
          : {}),
      },
    });
  };

  // Tema "Light" pill de las guías de marca de Google: fondo blanco, borde
  // #747775, texto #1F1F1F. El texto localizado ("Continuar con Google") es
  // una de las variantes que Google permite explícitamente traducir — lo
  // que NO se puede tocar es el ícono ni sus colores (ver GoogleGIcon).
  return (
    <button
      onClick={handleLogin}
      className="flex w-full items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-white py-2.5 pl-3 pr-4 text-[14px] font-medium leading-5 text-[#1F1F1F] transition-all duration-200 active:scale-95 hover:bg-[#1F1F1F]/[0.04]"
    >
      <GoogleGIcon />
      Continuar con Google
    </button>
  );
}

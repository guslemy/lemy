"use client";

import { createClient } from "@/lib/supabase/client";

// Login con Google. Pedimos también el scope de Calendar para poder,
// al final de la Fase 1, crear el evento + Google Meet automáticamente
// cuando el paciente paga el anticipo de una cita.
//
// `next` viaja hasta /auth/callback (que sí sabe leerlo) para que, si
// alguien llegó aquí a media reserva de cita, Google no lo mande a
// /dashboard a secas — regresa exactamente a donde iba.
export function GoogleLoginButton({ next }: { next?: string }) {
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
        scopes:
          "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy",
        queryParams: {
          access_type: "offline", // necesario para refresh_token (usarlo luego server-side)
          prompt: "consent",
        },
      },
    });
  };

  return (
    <button
      onClick={handleLogin}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-6 py-3 font-medium text-ink transition-all duration-200 active:scale-95 hover:border-forest hover:bg-forest/[0.03]"
    >
      Continuar con Google
    </button>
  );
}

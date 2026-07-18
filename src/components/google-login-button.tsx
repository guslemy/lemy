"use client";

import { createClient } from "@/lib/supabase/client";

// Login con Google. Pedimos también el scope de Calendar para poder,
// al final de la Fase 1, crear el evento + Google Meet automáticamente
// cuando el paciente paga el anticipo de una cita.
export function GoogleLoginButton() {
  const supabase = createClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
      className="flex items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 font-medium text-neutral-800 transition hover:bg-neutral-50"
    >
      Continuar con Google
    </button>
  );
}

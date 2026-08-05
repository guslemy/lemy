"use client";

import { createClient } from "@/lib/supabase/client";

// Botón para (re)conectar Google Calendar sin pasar por /login — el
// terapeuta ya tiene sesión iniciada, solo necesitamos que Google le pida
// consentimiento de nuevo (prompt=consent) para mandarnos un refresh_token
// fresco. Mismo mecanismo que google-login-button.tsx, pero pensado para
// alguien que ya está dentro del dashboard, no para el login inicial.
export function GoogleCalendarConnectButton({ label }: { label: string }) {
  const supabase = createClient();

  const handleConnect = async () => {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", "/dashboard/perfil?google_reconectado=1");

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        scopes:
          "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleConnect}
      className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-sage-white transition-all duration-200 active:scale-95 hover:bg-forest-deep"
    >
      {label}
    </button>
  );
}

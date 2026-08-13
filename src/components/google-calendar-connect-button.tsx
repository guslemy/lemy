"use client";

import { createClient } from "@/lib/supabase/client";
import { GoogleGIcon } from "@/components/google-g-icon";

// Botón para (re)conectar Google Calendar sin pasar por /login — el
// terapeuta ya tiene sesión iniciada, solo necesitamos que Google le pida
// consentimiento de nuevo (prompt=consent) para mandarnos un refresh_token
// fresco. Mismo mecanismo que google-login-button.tsx, pero pensado para
// alguien que ya está dentro del dashboard, no para el login inicial.
export function GoogleCalendarConnectButton({ label }: { label: string }) {
  const supabase = createClient();

  const handleConnect = async () => {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", "/dashboard?tab=perfil&perfil_google_reconectado=1");

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

  // Mismo tema "Light" que google-login-button.tsx — las guías de marca de
  // Google prohíben poner el ícono "G" a color sobre un fondo que no sea
  // uno de sus tres temas aprobados (light/dark/neutral); el verde forest
  // de Lemy no es ninguno de los tres.
  return (
    <button
      type="button"
      onClick={handleConnect}
      className="flex items-center gap-2.5 rounded-full border border-[#747775] bg-white py-2.5 pl-3 pr-4 text-[14px] font-medium leading-5 text-[#1F1F1F] transition-all duration-200 active:scale-95 hover:bg-[#1F1F1F]/[0.04]"
    >
      <GoogleGIcon />
      {label}
    </button>
  );
}

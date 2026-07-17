import { createClient } from "@/lib/supabase/server";
import { SiteHeaderClient, type SiteRole } from "./site-header-client";

// Server component: resuelve sesión + rol una vez por render y se lo pasa
// al header interactivo (que sigue siendo cliente por el menú móvil). Antes
// el header no sabía si había sesión, así que alguien ya logueado seguía
// viendo "Iniciar sesión" / "Soy terapeuta" en vez de un atajo a su panel.
export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: SiteRole = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = (profile?.role as SiteRole) ?? "patient";
  }

  return <SiteHeaderClient isLoggedIn={Boolean(user)} role={role} />;
}

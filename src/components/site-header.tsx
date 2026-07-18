import { createClient } from "@/lib/supabase/server";
import { countUnread } from "@/lib/notifications/feed";
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
  let unreadCount = 0;
  if (user) {
    const [{ data: profile }, unread] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      countUnread(supabase, user.id),
    ]);
    role = (profile?.role as SiteRole) ?? "patient";
    unreadCount = unread;
  }

  return <SiteHeaderClient isLoggedIn={Boolean(user)} role={role} unreadCount={unreadCount} />;
}

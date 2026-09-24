import { createClient } from "@/lib/supabase/server";
import { countUnread } from "@/lib/notifications/feed";
import { SiteHeaderClient, type SiteRole } from "./site-header-client";

// Server component: resuelve sesión + rol una vez por render y se lo pasa
// al header interactivo (que sigue siendo cliente por el menú móvil). Antes
// el header no sabía si había sesión, así que alguien ya logueado seguía
// viendo "Iniciar sesión" / "Soy terapeuta" en vez de un atajo a su panel.
// A Gustavo le gustó el header oscuro de la home (ver commit anterior,
// "Cambios al Home") y pidió usarlo en todo el sitio — inverted ahora es
// el default. Se deja el prop (en vez de borrar la rama "clara") por si
// algún día se necesita una página con el header claro otra vez.
export async function SiteHeader({ inverted = true }: { inverted?: boolean } = {}) {
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

  return <SiteHeaderClient isLoggedIn={Boolean(user)} role={role} unreadCount={unreadCount} inverted={inverted} />;
}

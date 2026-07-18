import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { getNotificationFeed, markAllRead } from "@/lib/notifications/feed";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "justo ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export default async function NotificacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await getNotificationFeed(supabase, user.id);
  // Al entrar a esta página se dan por vistas — mismo patrón que
  // ensureTherapistShell/ensurePatientShell, que ya se llaman directo
  // dentro del render de otras páginas de este dashboard.
  await markAllRead(supabase, user.id);

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[680px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Notificaciones
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Tu actividad reciente
          </h1>

          {items.length === 0 ? (
            <p className="mt-8 text-[0.95rem] text-[#3E4B44]">Todavía no tienes notificaciones.</p>
          ) : (
            <div className="mt-8 space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border px-5 py-4 ${
                    item.readAt ? "border-line bg-card" : "border-forest/30 bg-forest/[0.05]"
                  }`}
                >
                  <p className="text-[0.92rem] text-forest">{item.label}</p>
                  <p className="mt-1 text-[0.78rem] text-[#8B978F]">{timeAgo(item.sentAt)}</p>
                </div>
              ))}
            </div>
          )}

          <BackToDashboard />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

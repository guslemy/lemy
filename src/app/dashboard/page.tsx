import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { CopyLinkBox } from "@/components/copy-link-box";
import { PanelTabs, type PanelTab } from "@/components/panel-tabs";
import { TherapistPerfilTab } from "@/components/dashboard-tabs/therapist-perfil-tab";
import { TherapistDisponibilidadTab } from "@/components/dashboard-tabs/therapist-disponibilidad-tab";
import { TherapistCitasTab } from "@/components/dashboard-tabs/therapist-citas-tab";
import { TherapistSuscripcionTab } from "@/components/dashboard-tabs/therapist-suscripcion-tab";
import { TherapistPagosTab } from "@/components/dashboard-tabs/therapist-pagos-tab";
import { PatientMisCitasTab } from "@/components/dashboard-tabs/patient-mis-citas-tab";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { becomeTherapist } from "./actions";

// Bifurca por rol. Admin va a /dashboard/admin (su propio panel con
// pestañas). Terapeuta y paciente tienen aquí mismo su panel con pestañas
// (2026-08-14): antes cada sección (perfil, disponibilidad, citas,
// suscripción, cobros / mis citas) era su propia página — ahora todo vive
// en /dashboard, cambiar de sección no navega a otro lado. Las rutas viejas
// (/dashboard/perfil, etc.) siguen existiendo como redirects, por si algún
// correo o bookmark viejo apunta ahí (ver cada carpeta).
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, push_enabled")
    .eq("id", user.id)
    .maybeSingle();

  const isTherapist = profile?.role === "therapist";
  const isAdmin = profile?.role === "admin";

  // Admin no tiene nada que hacer en esta pantalla intermedia — su panel
  // real (contenido, verificaciones, usuarios) siempre es /dashboard/admin.
  // Antes había una tarjeta con un botón para llegar ahí; Gustavo pidió
  // saltársela (2026-08-14, ver project_lemy_dashboard_admin_redirect_pending
  // en memoria — ya confirmado, este redirect lo resuelve).
  if (isAdmin) redirect("/dashboard/admin");

  const { data: therapist } = isTherapist
    ? await supabase
        .from("therapists")
        .select("slug, display_name, is_published, subscription_status")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const sinPlan = isTherapist && therapist?.subscription_status !== "active";

  const therapistTabs: PanelTab[] = isTherapist
    ? [
        {
          key: "perfil",
          label: "Editar perfil",
          content: <TherapistPerfilTab params={sp} />,
        },
        {
          key: "disponibilidad",
          label: "Disponibilidad",
          content: <TherapistDisponibilidadTab params={sp} />,
        },
        {
          key: "citas",
          label: "Citas",
          content: <TherapistCitasTab params={sp} />,
        },
        {
          key: "suscripcion",
          label: "Suscripción",
          content: <TherapistSuscripcionTab params={sp} />,
        },
        {
          key: "pagos",
          label: "Cobros por consulta",
          content: <TherapistPagosTab params={sp} />,
        },
      ]
    : [];

  const patientTabs: PanelTab[] = [
    {
      key: "citas",
      label: "Mis citas",
      content: <PatientMisCitasTab params={sp} />,
    },
  ];

  const initialTabKey = sp.tab || (isTherapist ? "perfil" : "citas");

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[760px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Tu cuenta</p>
              <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
                Hola, {profile?.full_name ?? user.email}
              </h1>
            </div>

            {/* Visible siempre, sin importar la pestaña activa ni el rol (vive
                fuera de PanelTabs) — mismo criterio que el botón de "Ver mi
                perfil público" de abajo: es un ajuste de cuenta, no algo
                atado a una sección en particular. Aplica a todos los
                dispositivos de una vez (profiles.push_enabled), no solo a
                este navegador — ver notifications-toggle.tsx. */}
            <div className="flex flex-wrap items-center gap-2.5">
              <NotificationsToggle initialEnabled={profile?.push_enabled ?? true} />

              {/* Visible siempre, sin importar la pestaña activa (vive fuera de
                  PanelTabs) — antes el único link a esto estaba hasta abajo del
                  formulario de "Editar perfil", enterrado tras un scroll largo.
                  Solo se muestra si el perfil ya está publicado: antes de eso
                  la página /[slug] ni siquiera existe (getTherapist filtra por
                  is_published), así que el link rompería. */}
              {isTherapist && therapist?.slug && therapist?.is_published && (
                <Button href={`/${therapist.slug}`} variant="ghost" className="shrink-0">
                  Ver mi perfil público →
                </Button>
              )}
            </div>
          </div>

          {sinPlan && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-4">
              <p className="text-[0.9rem] text-rose-deep">
                Actualmente no cuentas con un plan. Elígelo y comienza a recibir pacientes ya.
              </p>
              <Button href="/dashboard?tab=suscripcion" variant="primary">
                Elegir plan
              </Button>
            </div>
          )}

          {isTherapist ? (
            <div className="mt-8">
              <PanelTabs tabs={therapistTabs} initialTabKey={initialTabKey} />
            </div>
          ) : (
            <div className="mt-8">
              <PanelTabs tabs={patientTabs} initialTabKey={initialTabKey} />
            </div>
          )}

          {isTherapist && therapist?.slug && (
            <div className="signature-corner mt-6 rounded-[28px] border border-line bg-card p-7">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">
                Invita y ahorra
              </p>
              <h2 className="mt-2 text-[1.2rem] text-forest">
                Invita a otras y otros terapeutas a Lemy
              </h2>
              <p className="mt-2 text-[0.92rem] text-[#42504A]">
                Comparte tu link personal. En cuanto la persona que invitaste empiece a pagar su
                suscripción, tu siguiente mensualidad baja 30%.
              </p>
              <p className="mt-2 text-[0.8rem] text-rose-deep">
                Para poder aprovechar este descuento, tu propia suscripción debe estar activa (no
                solo en periodo de prueba) en el momento en que tu invitado se suscriba.
              </p>
              <CopyLinkBox
                link={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx"}/api/ref?code=${therapist.slug}`}
              />
            </div>
          )}

          {!isTherapist && (
            <div className="signature-corner mt-8 rounded-[28px] border border-line bg-card p-7">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">
                ¿Eres terapeuta?
              </p>
              <h2 className="mt-2 text-[1.2rem] text-forest">Activa tu perfil en Lemy</h2>
              <p className="mt-2 text-[0.92rem] text-[#42504A]">
                Crea tu perfil profesional: formación, enfoque, tarifas y a quién atiendes. Tú decides
                cuándo publicarlo.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <form action={becomeTherapist}>
                  <Button type="submit" variant="primary">
                    Activar cuenta de terapeuta
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

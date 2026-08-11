import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { CopyLinkBox } from "@/components/copy-link-box";
import { becomeTherapist } from "./actions";

// Bifurca por rol: si ya es terapeuta, muestra el estado de su perfil; si es
// paciente (default al registrarse), ofrece activar la cuenta de terapeuta.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { guardado } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const isTherapist = profile?.role === "therapist";
  const isAdmin = profile?.role === "admin";

  const { data: therapist } = isTherapist
    ? await supabase
        .from("therapists")
        .select("slug, display_name, is_published, subscription_status")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const sinPlan = isTherapist && therapist?.subscription_status !== "active";

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[720px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Tu cuenta</p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Hola, {profile?.full_name ?? user.email}
          </h1>

          {guardado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Guardamos tus cambios.
            </p>
          )}

          {sinPlan && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-4">
              <p className="text-[0.9rem] text-rose-deep">
                Actualmente no cuentas con un plan. Elígelo y comienza a recibir pacientes ya.
              </p>
              <Button href="/dashboard/suscripcion" variant="primary">
                Elegir plan
              </Button>
            </div>
          )}

          {isAdmin ? (
            <div className="signature-corner mt-8 rounded-[28px] border border-line bg-card p-7">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">
                Cuenta de administrador
              </p>
              <h2 className="mt-2 text-[1.2rem] text-forest">Panel de contenido</h2>
              <p className="mt-2 text-[0.92rem] text-[#42504A]">
                Agrega o quita los videos educativos que aparecen en el buscador según palabra clave.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button href="/dashboard/contenido" variant="primary">
                  Ir al panel de contenido
                </Button>
                <Button href="/dashboard/admin" variant="ghost">
                  Gestión de usuarios
                </Button>
              </div>
            </div>
          ) : isTherapist ? (
            <div className="signature-corner mt-8 rounded-[28px] border border-line bg-card p-7">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">
                Perfil de terapeuta
              </p>
              <h2 className="mt-2 text-[1.2rem] text-forest">{therapist?.display_name}</h2>
              <p className="mt-2 text-[0.92rem] text-[#42504A]">
                {therapist?.is_published
                  ? "Tu perfil está publicado y visible en el buscador."
                  : "Tu perfil está en borrador — todavía no es visible para nadie."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button href="/dashboard/perfil" variant="primary">
                  Editar mi perfil
                </Button>
                <Button href="/dashboard/disponibilidad" variant="ghost">
                  Mi disponibilidad
                </Button>
                <Button href="/dashboard/citas" variant="ghost">
                  Mis citas
                </Button>
                <Button href="/dashboard/suscripcion" variant="ghost">
                  Suscripción
                </Button>
                <Button href="/dashboard/pagos" variant="ghost">
                  Cobros por consulta
                </Button>
                {therapist?.is_published && therapist?.slug && (
                  <Button href={`/${therapist.slug}`} variant="ghost">
                    Ver mi perfil público
                  </Button>
                )}
              </div>
            </div>
          ) : null}

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

          {!isAdmin && !isTherapist && (
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
                <Button href="/dashboard/mis-citas" variant="ghost">
                  Mis citas
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
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
        .select("slug, display_name, is_published")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

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

          {isAdmin ? (
            <div className="signature-corner mt-8 rounded-[28px] border border-line bg-card p-7">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">
                Cuenta de administrador
              </p>
              <h2 className="mt-2 text-[1.2rem] text-forest">Panel de contenido</h2>
              <p className="mt-2 text-[0.92rem] text-[#42504A]">
                Agrega o quita los videos educativos que aparecen en el buscador según palabra clave.
              </p>
              <div className="mt-5">
                <Button href="/dashboard/contenido" variant="primary">
                  Ir al panel de contenido
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
                {therapist?.is_published && therapist?.slug && (
                  <Button href={`/terapeuta/${therapist.slug}`} variant="ghost">
                    Ver mi perfil público
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="signature-corner mt-8 rounded-[28px] border border-line bg-card p-7">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">
                ¿Eres terapeuta?
              </p>
              <h2 className="mt-2 text-[1.2rem] text-forest">Activa tu perfil en Lemy</h2>
              <p className="mt-2 text-[0.92rem] text-[#42504A]">
                Crea tu perfil profesional: formación, enfoque, tarifas y a quién atiendes. Tú decides
                cuándo publicarlo.
              </p>
              <form action={becomeTherapist} className="mt-5">
                <Button type="submit" variant="primary">
                  Activar cuenta de terapeuta
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

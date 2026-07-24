import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Enfoques de terapia",
  description:
    "Qué significa cada enfoque terapéutico — Cognitivo-conductual, Psicodinámico, Sistémico, Humanista, Gestalt y EMDR — explicado en lenguaje llano.",
};

type Approach = {
  slug: string;
  nombre_tecnico: string;
  descripcion_coloquial: string | null;
};

async function getApproaches() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("therapeutic_approaches")
    .select("slug, nombre_tecnico, descripcion_coloquial")
    .order("nombre_tecnico");
  return (data ?? []) as Approach[];
}

// Página pública de referencia: cada perfil de terapeuta enlaza aquí desde
// su sección "Enfoque terapéutico" para quien quiera entender qué significa
// el nombre técnico que eligió su terapeuta, sin tener que adivinar por el
// nombre solo.
export default async function EnfoquesPage() {
  const approaches = await getApproaches();

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[720px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Para entender mejor
          </p>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium text-forest sm:text-[2.4rem]">
            Enfoques de terapia
          </h1>
          <p className="mt-3.5 text-[1.02rem] text-[#3E4B44]">
            Cada terapeuta en Lemy elige el enfoque con el que trabaja — es la escuela o el método
            detrás de sus sesiones. Ninguno es &quot;mejor&quot; que otro: el que más te sirva depende de ti
            y de lo que estés buscando trabajar.
          </p>

          <div className="mt-10 space-y-8">
            {approaches.map((a) => (
              <section key={a.slug} className="border-b border-line pb-8 last:border-0">
                <h2 className="font-display text-[1.2rem] text-forest">{a.nombre_tecnico}</h2>
                {a.descripcion_coloquial && (
                  <p className="mt-2 text-[0.96rem] leading-relaxed text-[#3E4B44]">
                    {a.descripcion_coloquial}
                  </p>
                )}
              </section>
            ))}
          </div>

          <p className="mt-10 text-[0.9rem] text-[#5A665F]">
            ¿No sabes cuál te conviene? No necesitas decidirlo tú sol@ —{" "}
            <a href="/encuentra" className="text-forest underline">
              responde el test de afinidad
            </a>{" "}
            y te acercamos a terapeutas que trabajan justo lo que necesitas, sin que tengas que
            elegir un enfoque de antemano.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

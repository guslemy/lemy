import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ApproachIcon } from "@/components/approach-icon";
import { AbstractCover } from "@/components/abstract-cover";
import { createClient } from "@/lib/supabase/server";
import { APPROACH_DETAILS } from "@/content/approaches-detail";

const PAGE_DESCRIPTION =
  "Qué significa cada enfoque terapéutico — Cognitivo-conductual, Psicodinámico, Sistémico, Humanista, Gestalt y EMDR — explicado en lenguaje llano, con para quién es cada uno y qué esperar en sesión.";

export const metadata: Metadata = {
  title: "Enfoques de terapia",
  description: PAGE_DESCRIPTION,
  openGraph: { title: "Enfoques de terapia", description: PAGE_DESCRIPTION, type: "article" },
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
// nombre solo. Cada enfoque trae un ícono propio (approach-icon.tsx) y dos
// bloques cortos —"para quién es" / "qué esperar"— para que la página no
// se sienta como una lista plana de definiciones.
export default async function EnfoquesPage() {
  const approaches = await getApproaches();

  // DefinedTermSet: le da a Google una estructura explícita de "esto es un
  // glosario de N términos", con su propia definición corta cada uno — más
  // probabilidad de salir como rich result que texto plano sin marcar.
  const definedTermSetJsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Enfoques de terapia",
    description: PAGE_DESCRIPTION,
    hasDefinedTerm: approaches.map((a) => ({
      "@type": "DefinedTerm",
      name: a.nombre_tecnico,
      description: a.descripcion_coloquial ?? undefined,
      inDefinedTermSet: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx"}/enfoques`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetJsonLd) }}
      />
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[820px]">
          <div className="signature-corner aspect-[21/9] w-full overflow-hidden rounded-[24px]">
            <AbstractCover seed="enfoques-de-terapia" className="h-full w-full" />
          </div>

          <p className="mt-8 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Para entender mejor
          </p>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium text-forest sm:text-[2.4rem]">
            Enfoques de terapia
          </h1>
          <p className="mt-3.5 max-w-[560px] text-[1.02rem] text-[#3E4B44]">
            Cada terapeuta en Lemy elige el enfoque con el que trabaja — es la escuela o el método
            detrás de sus sesiones. Ninguno es &quot;mejor&quot; que otro: el que más te sirva depende de ti
            y de lo que estés buscando trabajar.
          </p>

          <div className="mt-10 space-y-5">
            {approaches.map((a, i) => {
              const detail = APPROACH_DETAILS[a.slug];
              const alt = i % 2 === 1;
              return (
                <section
                  key={a.slug}
                  className={`signature-corner rounded-[28px] border border-line p-6 sm:p-8 ${
                    alt ? "bg-forest/[0.04]" : "bg-card"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-forest/10 text-forest">
                      <ApproachIcon slug={a.slug} />
                    </span>
                    <div>
                      <h2 className="font-display text-[1.25rem] text-forest">{a.nombre_tecnico}</h2>
                      {a.descripcion_coloquial && (
                        <p className="mt-1.5 text-[0.96rem] leading-relaxed text-[#3E4B44]">
                          {a.descripcion_coloquial}
                        </p>
                      )}
                    </div>
                  </div>

                  {detail && (
                    <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line/70 pt-5 sm:grid-cols-2">
                      <div>
                        <p className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-rose-deep">
                          Para quién es
                        </p>
                        <p className="mt-1.5 text-[0.9rem] leading-relaxed text-[#42504A]">
                          {detail.paraQuienEs}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-rose-deep">
                          Qué esperar
                        </p>
                        <p className="mt-1.5 text-[0.9rem] leading-relaxed text-[#42504A]">
                          {detail.queEsperar}
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <p className="mt-10 text-[0.9rem] text-[#5A665F]">
            ¿No sabes cuál te conviene? No necesitas decidirlo tú sol@ —{" "}
            <a href="/test" className="text-forest underline">
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

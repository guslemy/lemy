import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { addEducationalContent, deleteEducationalContent } from "./actions";

// Panel de administración de contenido educativo (solo profiles.role = 'admin').
// Los videos que se agreguen aquí aparecen en /buscar cuando alguien filtra
// por la especialidad correspondiente.

const PLATFORMS = [
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "otro", label: "Otro" },
];

type VideoRow = {
  id: string;
  title: string;
  platform: string;
  url: string;
  educational_content_specialties: { specialty: { nombre_coloquial: string } | null }[] | null;
};

export default async function ContenidoAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string; eliminado?: string; error?: string }>;
}) {
  const { guardado, eliminado, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/dashboard");

  const [{ data: specialties }, { data: rawVideos }] = await Promise.all([
    supabase.from("specialties").select("id, nombre_coloquial").order("nombre_coloquial"),
    supabase
      .from("educational_content")
      .select(
        "id, title, platform, url, created_at, educational_content_specialties ( specialty:specialties ( nombre_coloquial ) )"
      )
      .order("created_at", { ascending: false }),
  ]);

  const videos = (rawVideos ?? []) as unknown as VideoRow[];

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[760px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Panel de contenido
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Videos educativos por palabra clave
          </h1>
          <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
            Cada video puede tener una o varias palabras clave. Aparecen en el buscador cuando alguien
            filtra por alguna de ellas, para que llegue más preparad@ a su consulta.
          </p>

          {guardado === "1" && <Banner>Video agregado.</Banner>}
          {eliminado === "1" && <Banner>Video eliminado.</Banner>}
          {error === "1" && <Banner tone="error">Falta título, link o al menos una palabra clave.</Banner>}

          <form
            action={addEducationalContent}
            className="signature-corner mt-8 space-y-4 rounded-[28px] border border-line bg-card p-7"
          >
            <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
              Agregar video
            </h2>

            <Field label="Título">
              <input
                name="title"
                required
                className="input-lemy"
                placeholder="Ej. Qué es la ansiedad y cómo se siente"
              />
            </Field>

            <div>
              <span className="mb-2 block text-[0.85rem] font-medium text-forest">
                Palabras clave (elige todas las que apliquen)
              </span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(specialties ?? []).map((s) => (
                  <label key={s.id} className="flex items-center gap-2.5 text-[0.88rem] text-[#3E4B44]">
                    <input
                      type="checkbox"
                      name="specialties"
                      value={s.id}
                      className="h-4 w-4 accent-forest"
                    />
                    {s.nombre_coloquial}
                  </label>
                ))}
              </div>
            </div>

            <Field label="Plataforma">
              <select name="platform" defaultValue="youtube" className="input-lemy">
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Link del video">
              <input
                name="url"
                type="url"
                required
                className="input-lemy"
                placeholder="https://youtube.com/..."
              />
            </Field>

            <Button type="submit" variant="primary">
              Guardar video
            </Button>
          </form>

          <div className="mt-10 space-y-3">
            {videos.length === 0 && (
              <p className="text-[0.9rem] text-[#5A665F]">Todavía no has agregado ningún video.</p>
            )}

            {videos.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-[0.95rem] font-medium text-forest">{v.title}</p>
                  <p className="mt-0.5 truncate text-[0.8rem] text-[#5A665F]">
                    {(v.educational_content_specialties ?? [])
                      .map((es) => es.specialty?.nombre_coloquial)
                      .filter(Boolean)
                      .join(", ") || "—"}{" "}
                    · {v.platform}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-4">
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[0.85rem] font-medium text-forest hover:text-rose-deep"
                  >
                    Ver ↗
                  </a>
                  <form action={deleteEducationalContent}>
                    <input type="hidden" name="id" value={v.id} />
                    <button
                      type="submit"
                      className="text-[0.85rem] font-medium text-rose-deep hover:text-[#a86356]"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">{label}</span>
      {children}
    </label>
  );
}

function Banner({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "error" }) {
  return (
    <p
      className={`mt-4 rounded-2xl border px-5 py-3 text-[0.9rem] ${
        tone === "error"
          ? "border-rose-deep/40 bg-rose/10 text-rose-deep"
          : "border-line bg-forest/[0.06] text-forest"
      }`}
    >
      {children}
    </p>
  );
}

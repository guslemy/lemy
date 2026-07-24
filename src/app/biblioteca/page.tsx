import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { BLOG_POSTS } from "@/content/blog-posts";

export const metadata: Metadata = {
  title: "Biblioteca",
  description:
    "Artículos y videos sobre terapia y salud mental, en lenguaje claro y sin jerga clínica.",
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type VideoRow = {
  id: string;
  title: string;
  platform: string;
  url: string;
  educational_content_specialties: { specialty: { nombre_coloquial: string } | null }[] | null;
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  otro: "Video",
};

async function getVideos() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("educational_content")
    .select(
      "id, title, platform, url, educational_content_specialties ( specialty:specialties ( nombre_coloquial ) )"
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as VideoRow[];
}

// La biblioteca junta los dos formatos de contenido educativo que tiene
// Lemy — artículos propios (src/content/blog-posts.ts) y videos que ya se
// administran desde /dashboard/contenido — en un solo destino público.
// Antes los videos no tenían dónde verse agrupados: solo aparecían sueltos,
// filtrados por especialidad, dentro de /buscar.
export default async function BibliotecaPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  const videos = await getVideos();

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[860px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Biblioteca
          </p>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium text-forest sm:text-[2.4rem]">
            Para entender mejor, antes de dar el paso
          </h1>
          <p className="mt-3.5 text-[1.02rem] text-[#3E4B44]">
            Artículos y videos sobre terapia y salud mental, en lenguaje claro y sin jerga clínica.
          </p>

          <section className="mt-10">
            <h2 className="mb-4 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
              Artículos
            </h2>
            <div className="space-y-6">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/biblioteca/${post.slug}`}
                  className="signature-corner block rounded-[24px] border border-line bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)] sm:p-7"
                >
                  <p className="font-mono text-[0.72rem] text-[#7C877F]">
                    {formatDate(post.publishedAt)} · {post.readingMinutes} min de lectura
                  </p>
                  <h3 className="mt-2 font-display text-[1.3rem] text-forest">{post.title}</h3>
                  <p className="mt-1.5 text-[0.94rem] text-[#42504A]">{post.excerpt}</p>
                  <span className="mt-3 inline-block text-[0.85rem] font-semibold text-rose-deep">
                    Leer artículo →
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {videos.length > 0 && (
            <section className="mt-14">
              <h2 className="mb-4 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                Videos
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {videos.map((video) => {
                  const specialtyNames = (video.educational_content_specialties ?? [])
                    .map((s) => s.specialty?.nombre_coloquial)
                    .filter(Boolean);
                  return (
                    <a
                      key={video.id}
                      href={video.url}
                      target="_blank"
                      rel="noreferrer"
                      className="signature-corner block rounded-[20px] border border-line bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)]"
                    >
                      <span className="inline-block rounded-full bg-forest/[0.08] px-2.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.05em] text-forest">
                        {PLATFORM_LABEL[video.platform] ?? "Video"}
                      </span>
                      <h3 className="mt-2.5 font-display text-[1.05rem] text-forest">{video.title}</h3>
                      {specialtyNames.length > 0 && (
                        <p className="mt-1.5 text-[0.82rem] text-[#7C877F]">
                          {specialtyNames.join(" · ")}
                        </p>
                      )}
                      <span className="mt-3 inline-block text-[0.82rem] font-semibold text-rose-deep">
                        Ver video →
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

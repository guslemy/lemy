import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BibliotecaExplorer, type ExplorerPost, type ExplorerVideo } from "@/components/biblioteca-explorer";
import { createClient } from "@/lib/supabase/server";
import { BLOG_POSTS } from "@/content/blog-posts";
import { detectVideoOrientation, resolveVideoThumbnail } from "@/lib/video-utils";

export const metadata: Metadata = {
  title: "Biblioteca",
  description:
    "Artículos y videos sobre terapia y salud mental, en lenguaje claro y sin jerga clínica.",
};

type VideoRow = {
  id: string;
  title: string;
  platform: string;
  url: string;
  thumbnail_url: string | null;
  educational_content_specialties: { specialty: { nombre_coloquial: string } | null }[] | null;
};

async function getVideos(): Promise<ExplorerVideo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("educational_content")
    .select(
      "id, title, platform, url, thumbnail_url, educational_content_specialties ( specialty:specialties ( nombre_coloquial ) )"
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as VideoRow[];

  return rows.map((v) => ({
    id: v.id,
    title: v.title,
    platform: v.platform,
    url: v.url,
    specialtyNames: (v.educational_content_specialties ?? [])
      .map((es) => es.specialty?.nombre_coloquial)
      .filter((s): s is string => Boolean(s)),
    thumbnail: resolveVideoThumbnail(v),
    orientation: detectVideoOrientation(v),
  }));
}

// La biblioteca junta los dos formatos de contenido educativo que tiene
// Lemy — artículos propios (src/content/blog-posts.ts) y videos que ya se
// administran desde /dashboard/contenido — en un solo destino público, con
// buscador y filtro de tipo (BibliotecaExplorer, componente cliente).
// Videos va primero: es la sección visualmente más atractiva y no hay una
// razón de fondo para anteponer los artículos.
export default async function BibliotecaPage() {
  const posts: ExplorerPost[] = [...BLOG_POSTS]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt,
      readingMinutes: post.readingMinutes,
      tags: post.tags,
    }));

  const videos = await getVideos();

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[980px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Biblioteca
          </p>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium text-forest sm:text-[2.4rem]">
            Para entender mejor, antes de dar el paso
          </h1>
          <p className="mt-3.5 max-w-[560px] text-[1.02rem] text-[#3E4B44]">
            Artículos y videos sobre terapia y salud mental, en lenguaje claro y sin jerga clínica.
          </p>

          <BibliotecaExplorer posts={posts} videos={videos} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

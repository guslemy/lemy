import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BLOG_POSTS } from "@/content/blog-posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Artículos sobre terapia, salud mental y cómo dar el primer paso — en lenguaje claro, sin jerga clínica.",
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

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[860px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Blog</p>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium text-forest sm:text-[2.4rem]">
            Para entender mejor, antes de dar el paso
          </h1>
          <p className="mt-3.5 text-[1.02rem] text-[#3E4B44]">
            Artículos sobre terapia y salud mental, en lenguaje claro y sin jerga clínica.
          </p>

          <div className="mt-10 space-y-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="signature-corner block rounded-[24px] border border-line bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)] sm:p-7"
              >
                <p className="font-mono text-[0.72rem] text-[#7C877F]">
                  {formatDate(post.publishedAt)} · {post.readingMinutes} min de lectura
                </p>
                <h2 className="mt-2 font-display text-[1.3rem] text-forest">{post.title}</h2>
                <p className="mt-1.5 text-[0.94rem] text-[#42504A]">{post.excerpt}</p>
                <span className="mt-3 inline-block text-[0.85rem] font-semibold text-rose-deep">
                  Leer artículo →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

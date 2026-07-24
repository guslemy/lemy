import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { BLOG_POSTS, getBlogPost, type BlogBlock } from "@/content/blog-posts";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Artículo no encontrado" };
  return {
    title: post.title,
    description: post.metaDescription,
    openGraph: { title: post.title, description: post.metaDescription, type: "article" },
  };
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-9 mb-3 font-display text-[1.35rem] text-forest">{block.text}</h2>;
    case "h3":
      return <h3 className="mt-6 mb-2 font-display text-[1.1rem] text-forest">{block.text}</h3>;
    case "p":
      return <p className="mt-4 text-[1rem] leading-relaxed text-[#37433D]">{block.text}</p>;
    case "ul":
      return (
        <ul className="mt-4 space-y-2 pl-5 text-[1rem] leading-relaxed text-[#37433D]">
          {block.items.map((item) => (
            <li key={item} className="list-disc">
              {item}
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="mt-6 border-l-[3px] border-rose pl-4.5 font-display text-[1.05rem] italic text-forest">
          {block.text}
          {block.attribution && (
            <span className="mt-2 block font-sans text-[0.82rem] not-italic text-[#6B776F]">
              — {block.attribution}
            </span>
          )}
        </blockquote>
      );
    case "cta":
      return (
        <div className="mt-9 rounded-[24px] border border-line bg-card p-6 text-center">
          <p className="mb-3.5 text-[0.98rem] text-[#3E4B44]">{block.text}</p>
          <Button href={block.href} variant="primary">
            {block.label}
          </Button>
        </div>
      );
    default:
      return null;
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: post.authorName },
    publisher: { "@type": "Organization", name: "Lemy" },
    mainEntityOfPage: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx"}/blog/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <article className="mx-auto max-w-[680px]">
          <Link href="/blog" className="text-[0.85rem] font-medium text-forest hover:text-rose-deep">
            ← Volver al blog
          </Link>

          <p className="mt-6 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            {formatDate(post.publishedAt)} · {post.readingMinutes} min de lectura
          </p>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium leading-[1.15] text-forest sm:text-[2.3rem]">
            {post.title}
          </h1>
          <p className="mt-2 text-[0.85rem] text-[#7C877F]">Por {post.authorName}</p>

          <div className="mt-2">
            {post.blocks.map((block, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Block key={i} block={block} />
            ))}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AbstractCover } from "@/components/abstract-cover";

export type ExplorerPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readingMinutes: number;
  tags: string[];
};

export type ExplorerVideo = {
  id: string;
  title: string;
  platform: string;
  url: string;
  specialtyNames: string[];
  thumbnail: string | null;
  orientation: "horizontal" | "vertical";
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  otro: "Video",
};

type Filter = "todos" | "articulos" | "videos";

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function matches(searchable: string[], query: string) {
  if (!query.trim()) return true;
  const q = normalize(query);
  return searchable.some((s) => normalize(s).includes(q));
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

// Agrupa videos consecutivos con la misma orientación en su propia "fila",
// tipo YouTube: filas horizontales normales que de repente dan paso a una
// franja de scroll con solo videos verticales. Se agrupa sobre el orden que
// ya trae la lista (más reciente primero), no se reordena por orientación.
function groupIntoShelves(videos: ExplorerVideo[]) {
  const shelves: { orientation: ExplorerVideo["orientation"]; items: ExplorerVideo[] }[] = [];
  for (const v of videos) {
    const last = shelves[shelves.length - 1];
    if (last && last.orientation === v.orientation) {
      last.items.push(v);
    } else {
      shelves.push({ orientation: v.orientation, items: [v] });
    }
  }
  return shelves;
}

function VideoThumb({ video }: { video: ExplorerVideo }) {
  if (video.thumbnail) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={video.thumbnail}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  }
  return <AbstractCover seed={video.id} className="h-full w-full" />;
}

function HorizontalVideoCard({ video }: { video: ExplorerVideo }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      className="signature-corner group block overflow-hidden rounded-[20px] border border-line bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)]"
    >
      <div className="aspect-video w-full overflow-hidden bg-forest/5">
        <VideoThumb video={video} />
      </div>
      <div className="p-5">
        <span className="inline-block rounded-full bg-forest/[0.08] px-2.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.05em] text-forest">
          {PLATFORM_LABEL[video.platform] ?? "Video"}
        </span>
        <h3 className="mt-2.5 font-display text-[1.05rem] text-forest">{video.title}</h3>
        {video.specialtyNames.length > 0 && (
          <p className="mt-1.5 text-[0.82rem] text-[#7C877F]">{video.specialtyNames.join(" · ")}</p>
        )}
        <span className="mt-3 inline-block text-[0.82rem] font-semibold text-rose-deep">
          Ver video →
        </span>
      </div>
    </a>
  );
}

function VerticalVideoCard({ video }: { video: ExplorerVideo }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      className="signature-corner group block w-[170px] flex-none overflow-hidden rounded-[18px] border border-line bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)]"
    >
      <div className="aspect-[9/16] w-full overflow-hidden bg-forest/5">
        <VideoThumb video={video} />
      </div>
      <div className="p-3.5">
        <span className="inline-block rounded-full bg-forest/[0.08] px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.05em] text-forest">
          {PLATFORM_LABEL[video.platform] ?? "Video"}
        </span>
        <h3 className="mt-2 line-clamp-2 font-display text-[0.88rem] leading-snug text-forest">
          {video.title}
        </h3>
      </div>
    </a>
  );
}

export function BibliotecaExplorer({
  posts,
  videos,
}: {
  posts: ExplorerPost[];
  videos: ExplorerVideo[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const filteredPosts = useMemo(
    () => posts.filter((p) => matches([p.title, p.excerpt, ...p.tags], query)),
    [posts, query]
  );

  const filteredVideos = useMemo(
    () => videos.filter((v) => matches([v.title, ...v.specialtyNames], query)),
    [videos, query]
  );

  const showPosts = filter !== "videos";
  const showVideos = filter !== "articulos";
  const shelves = useMemo(() => groupIntoShelves(filteredVideos), [filteredVideos]);
  const noResults =
    (!showPosts || filteredPosts.length === 0) && (!showVideos || filteredVideos.length === 0);

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 sm:max-w-[340px]">
          <div className="relative">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C877F]"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.4-3.4" />
            </svg>
            {/* .input-lemy trae su propio padding en globals.css (fuera de
                @layer, así que le gana a pl-10 sin el !) — con ! forzamos
                que el padding-left sí deje espacio para el ícono. */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por tema…"
              className="input-lemy w-full !pl-10"
            />
          </div>
          <p className="mt-2 text-[0.8rem] text-[#8B978F]">
            Busca lo que sientes o quieras entender mejor — ansiedad, terapia
            cognitivo-conductual, duelo…
          </p>
        </div>

        <div className="flex flex-none gap-2">
          {(
            [
              ["todos", "Todos"],
              ["videos", "Videos"],
              ["articulos", "Artículos"],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-1.5 text-[0.85rem] font-medium transition-colors ${
                filter === value
                  ? "bg-forest text-white"
                  : "border border-line bg-card text-[#42504A] hover:border-forest/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {noResults && (
        <p className="mt-10 text-[0.95rem] text-[#5A665F]">
          No encontramos nada para &quot;{query}&quot;. Prueba con otra palabra.
        </p>
      )}

      {showVideos && filteredVideos.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
            Videos
          </h2>
          <div className="space-y-5">
            {shelves.map((shelf, i) =>
              shelf.orientation === "horizontal" ? (
                <div key={i} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {shelf.items.map((video) => (
                    <HorizontalVideoCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <div key={i} className="flex gap-4 overflow-x-auto pb-1">
                  {shelf.items.map((video) => (
                    <VerticalVideoCard key={video.id} video={video} />
                  ))}
                </div>
              )
            )}
          </div>
        </section>
      )}

      {showPosts && filteredPosts.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
            Artículos
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {filteredPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/biblioteca/${post.slug}`}
                className="signature-corner group block overflow-hidden rounded-[24px] border border-line bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)]"
              >
                <div className="aspect-[16/9] w-full overflow-hidden">
                  <AbstractCover seed={post.slug} className="h-full w-full" />
                </div>
                <div className="p-6">
                  <p className="font-mono text-[0.72rem] text-[#7C877F]">
                    {formatDate(post.publishedAt)} · {post.readingMinutes} min de lectura
                  </p>
                  <h3 className="mt-2 font-display text-[1.2rem] text-forest">{post.title}</h3>
                  <p className="mt-1.5 text-[0.9rem] text-[#42504A]">{post.excerpt}</p>
                  <span className="mt-3 inline-block text-[0.85rem] font-semibold text-rose-deep">
                    Leer artículo →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

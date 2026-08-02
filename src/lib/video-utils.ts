// Utilidades puras (sin llamadas a red ni a Supabase) para resolver
// thumbnail y orientación de un video de /dashboard/contenido, usadas tanto
// en el server component de /biblioteca como en cualquier otro lugar que
// necesite lo mismo.

const YOUTUBE_ID_PATTERNS = [
  /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
  /youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{6,})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
];

export function getYoutubeVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

type VideoLike = { platform: string; url: string; thumbnail_url?: string | null };

// YouTube tiene una URL de thumbnail predecible a partir del ID del video —
// no hace falta llamar a ninguna API. Instagram y TikTok no tienen ese
// patrón público, así que ahí dependemos del campo opcional thumbnail_url
// que se llena a mano en /dashboard/contenido. Si no hay ninguno de los
// dos, el llamador debe usar <AbstractCover /> como respaldo (nunca un
// ícono genérico de la plataforma).
export function resolveVideoThumbnail(video: VideoLike): string | null {
  if (video.thumbnail_url) return video.thumbnail_url;
  if (video.platform === "youtube") {
    const id = getYoutubeVideoId(video.url);
    if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }
  return null;
}

export type VideoOrientation = "horizontal" | "vertical";

// Heurística por URL, sin campo manual ni toggle: TikTok es vertical casi
// siempre; en YouTube solo los Shorts son verticales; en Instagram solo los
// Reels. Todo lo demás se asume horizontal.
export function detectVideoOrientation(video: { platform: string; url: string }): VideoOrientation {
  if (video.platform === "tiktok") return "vertical";
  const url = video.url.toLowerCase();
  if (url.includes("/shorts/")) return "vertical";
  if (url.includes("/reel/") || url.includes("/reels/")) return "vertical";
  return "horizontal";
}

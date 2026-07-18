// Normaliza links que la gente pega a mano: mucha gente escribe
// "www.youtube.com/..." o incluso "youtube.com/..." sin protocolo, y el
// input type="url" nativo del navegador los rechaza de plano. Aquí somos
// permisivos: si no trae protocolo, le agregamos https:// nosotros.
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

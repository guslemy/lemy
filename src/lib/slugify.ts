// Convierte un nombre en un slug de URL: quita acentos, espacios y símbolos.
// Ej. "María José Núñez" -> "maria-jose-nunez"
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita los acentos (diacríticos)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

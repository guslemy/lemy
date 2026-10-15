import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx";

// Nada de esto le sirve a un buscador y algunos son privados por
// naturaleza (dashboard, auth, endpoints internos).
const PRIVADO = ["/dashboard", "/dashboard/", "/api/", "/auth/", "/login"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // (2026-10-15) /buscar?q=... genera combinaciones infinitas de URL que
        // no aportan al SEO. /buscar y /buscar?especialidad=... (que están en
        // el sitemap) siguen abiertos.
        disallow: [...PRIVADO, "/buscar?q="],
      },
      {
        // GPTBot (OpenAI, solo entrenamiento) llegó a hacer ~72 mil pedidos en
        // 12 h a /buscar con filtros, agotando la cuota de Vercel Hobby.
        // OAI-SearchBot (el que alimenta ChatGPT Search) NO se toca: usa el
        // grupo "*". Ojo: GPTBot solo obedece SU grupo, por eso se repite
        // PRIVADO aquí.
        userAgent: "GPTBot",
        allow: "/",
        disallow: [...PRIVADO, "/buscar?"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

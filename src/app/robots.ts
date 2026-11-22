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
        // (2026-11-16) Se cierran también las combinaciones de VARIAS
        // especialidades (llevan coma: ?especialidad=ansiedad,duelo) y la
        // búsqueda por texto aunque venga después de otro filtro (&q=). Esas
        // URLs ya eran noindex (ver generateMetadata en buscar/page.tsx), así
        // que a Google no le aportan nada, pero Claude-SearchBot las pedía unas
        // 86 mil veces al día y cada una cuesta cómputo en Vercel. Las de UNA
        // sola especialidad (las que sí traen visitas) siguen abiertas.
        // El * es comodín (lo entienden Google, Bing y los demás grandes).
        disallow: [...PRIVADO, "/buscar?q=", "/buscar?*&q=", "/buscar?*,", "/buscar?*%2C"],
      },
      {
        // Rastreadores de IA que recolectan contenido para ENTRENAR modelos.
        // GPTBot (OpenAI) llegó a hacer ~72 mil pedidos en 12 h a /buscar con
        // filtros, agotando la cuota de Vercel Hobby (oct 2026); ClaudeBot
        // (Anthropic) hizo ~465 mil en una semana (nov 2026) y agotó la cuota
        // de egress de Supabase. Se les cierra /buscar con filtros pero el
        // resto del sitio sigue abierto. Los que alimentan búsquedas o
        // asistentes (OAI-SearchBot, ChatGPT-User, Claude-SearchBot,
        // Claude-User, PerplexityBot) NO se tocan: usan el grupo "*".
        // Ojo: cada bot solo obedece SU grupo, por eso se repite PRIVADO aquí.
        // Google-Extended no hace falta: no rastrea, solo es una etiqueta que
        // decide si Google usa lo que ya rastreó Googlebot para entrenar Gemini.
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "CCBot", // Common Crawl (base de entrenamiento de muchos modelos)
          "Bytespider", // ByteDance — de los más agresivos
          "Amazonbot",
          "meta-externalagent", // Meta
          "Applebot-Extended",
          "cohere-ai",
          "Diffbot",
        ],
        allow: "/",
        disallow: [...PRIVADO, "/buscar?"],
        // ClaudeBot, Bytespider y otros respetan una pausa entre pedidos
        // (segundos). No todos la leen, pero a los que sí la leen les baja el ritmo.
        crawlDelay: 10,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nada de esto le sirve a un buscador y algunos son privados por
      // naturaleza (dashboard, auth, endpoints internos).
      disallow: ["/dashboard", "/dashboard/", "/api/", "/auth/", "/login"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

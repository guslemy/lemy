import type { MetadataRoute } from "next";

// Next sirve esto automáticamente en /manifest.webmanifest y agrega el
// <link rel="manifest"> en <head> — no hace falta declararlo a mano en
// metadata (layout.tsx). Es lo que hace posible "Agregar a pantalla de
// inicio" (ver AddToHomeScreenPrompt) y, más adelante, notificaciones push
// reales en iOS (que solo funcionan si el sitio está instalado así).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lemy — Encuentra a quien sí va a escucharte",
    short_name: "Lemy",
    description: "Directorio de psicoterapeutas verificados en Oaxaca.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f2f5ef",
    theme_color: "#1e3a2e",
    lang: "es-MX",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

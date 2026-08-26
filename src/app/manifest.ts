import type { MetadataRoute } from "next";

// A diferencia de src/app/icon.png y apple-icon.png (que siguen la
// convención de archivos de Next y se sirven con un hash de contenido en la
// URL, cache-busting automático en cada build), estos íconos viven como
// archivos estáticos sueltos en /public/icons — misma URL siempre, aunque
// cambie el contenido del PNG. Un navegador o una PWA ya instalada que los
// haya descargado una vez no tiene ninguna razón para volver a pedirlos.
// ICON_VERSION fuerza una URL nueva cada vez que se reemplaza el ícono —
// súbele el número cada vez que vuelvas a cambiar los PNG de /public/icons.
const ICON_VERSION = "2";

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
      { src: `/icons/icon-192.png?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png" },
      { src: `/icons/icon-512.png?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png" },
    ],
  };
}

import type { Metadata, Viewport } from "next";
import { PageTransition } from "@/components/page-transition";
import { HashScrollFix } from "@/components/hash-scroll-fix";
import { AddToHomeScreenPrompt } from "@/components/add-to-home-screen-prompt";
import { EnableNotificationsPrompt } from "@/components/enable-notifications-prompt";
import "./globals.css";

// Nota: las fuentes se cargan con <link> en vez de next/font/google —
// así el navegador las pide en tiempo real y no depende de que el proceso
// de build tenga salida a internet (nuestro sandbox de verificación no la
// tiene; Vercel sí, pero este método funciona en ambos casos sin diferencias).

export const metadata: Metadata = {
  title: {
    default: "Lemy — Encuentra a quien sí va a escucharte",
    template: "%s — Lemy",
  },
  description:
    "Directorio de psicoterapeutas verificados en Oaxaca. Perfiles claros, en lenguaje humano, sin jerga clínica.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx"),
  openGraph: {
    siteName: "Lemy",
    type: "website",
    locale: "es_MX",
  },
  // Sin esto, Safari abre la app instalada con la barra de navegador
  // visible y el título genérico de la pestaña en vez del ícono/nombre de
  // Lemy en el multitarea — parte del mismo cambio que manifest.ts.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lemy",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a2e",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Lemy",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx",
  description:
    "Directorio de psicoterapeutas verificados en Oaxaca, México. Perfiles claros, en lenguaje humano, sin jerga clínica.",
  areaServed: {
    "@type": "City",
    name: "Oaxaca",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-sage-white font-sans text-ink antialiased">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <HashScrollFix />
        <PageTransition>{children}</PageTransition>
        <AddToHomeScreenPrompt />
        <EnableNotificationsPrompt />
      </body>
    </html>
  );
}

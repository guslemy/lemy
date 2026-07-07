import type { Metadata } from "next";
import "./globals.css";

// Nota: las fuentes se cargan con <link> en vez de next/font/google —
// así el navegador las pide en tiempo real y no depende de que el proceso
// de build tenga salida a internet (nuestro sandbox de verificación no la
// tiene; Vercel sí, pero este método funciona en ambos casos sin diferencias).

export const metadata: Metadata = {
  title: "Lemy — Encuentra a quien sí va a escucharte",
  description:
    "Directorio de psicoterapeutas verificados en Oaxaca. Perfiles claros, en lenguaje humano, sin jerga clínica.",
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
        {children}
      </body>
    </html>
  );
}

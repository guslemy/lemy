import type { Metadata } from "next";
import "./globals.css";

// Nota: usamos la pila de fuentes del sistema (sin next/font/google) para no
// depender de fetch a Google Fonts en build time. Si más adelante queremos
// una tipografía de marca, se agrega como next/font/local con el archivo
// descargado en el repo.

export const metadata: Metadata = {
  title: "Northstar — Encuentra a tu psicoterapeuta",
  description:
    "Plataforma para encontrar psicoterapeutas en Oaxaca, explicada en lenguaje claro y cercano.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

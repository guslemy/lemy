import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit (exportación del expediente a PDF, ver
  // api/pacientes/[id]/expediente-pdf) depende de fontkit, que usa un
  // decorador de @swc/helpers que el bundler de Turbopack no resuelve bien
  // (revienta el build con "Export applyDecoratedDescriptor doesn't exist").
  // serverExternalPackages saca este paquete del bundling y lo deja como
  // require() nativo de Node en tiempo de ejecución — ahí sí funciona sin
  // problema, es exactamente para lo que existe esta opción.
  serverExternalPackages: ["pdfkit", "fontkit"],
  // Next.js limita a 1 MB el body de cualquier Server Action por default —
  // uploadTherapistPhoto (dashboard/perfil) es una Server Action, y casi
  // cualquier foto de celular real pesa más de 1 MB. Sin este ajuste, esas
  // fotos se rechazan a nivel de plataforma ANTES de llegar a nuestra
  // propia validación de 5 MB (MAX_PHOTO_BYTES en dashboard/actions.ts) —
  // por eso se veía un error genérico de red ("Couldn't load") en vez de
  // nuestro mensaje de "esa imagen pesa demasiado". 8mb deja margen sobre
  // el límite de 5MB de la app (el body real de un multipart/form-data
  // pesa un poco más que el archivo solo).
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  // /blog se fusionó con los videos en /biblioteca — estos redirects
  // conservan el SEO ya indexado de los artículos que se alcanzaron a
  // publicar bajo /blog.
  async redirects() {
    return [
      { source: "/blog", destination: "/biblioteca", permanent: true },
      { source: "/blog/:slug", destination: "/biblioteca/:slug", permanent: true },
      { source: "/encuentra", destination: "/test", permanent: true },
      // El perfil público del terapeuta se movió a la raíz del dominio
      // (lemy.mx/[slug]) para que sea un link corto tipo "linktr.ee/user" —
      // este redirect conserva cualquier link ya compartido con la URL vieja.
      { source: "/terapeuta/:slug", destination: "/:slug", permanent: true },
    ];
  },
};

export default nextConfig;

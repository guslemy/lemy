// Todo lo que vive como carpeta de ruta en src/app/ (o que Next.js sirve
// como archivo especial) — un terapeuta no puede usar ninguno de estos como
// slug de perfil público. Next.js siempre prioriza una ruta explícita sobre
// el catch-all /[slug], así que técnicamente nadie podría "romper" el sitio
// con un slug así, pero su propio perfil quedaría inalcanzable (la ruta
// real le ganaría el paso) — mejor bloquearlo aquí con un error claro que
// dejar que alguien se registre con un link que nunca va a funcionar.
export const RESERVED_SLUGS = new Set([
  "api",
  "auth",
  "biblioteca",
  "buscar",
  "completar-perfil",
  "dashboard",
  "enfoques",
  "gracias",
  "login",
  "privacidad",
  "terapeuta",
  "terminos",
  "test",
  "admin",
  "www",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
]);

// Origen de registro (UTM) — de dónde llegó cada persona que se creó una cuenta.
//
// Problema que resuelve (2026-11-17): un enlace como
//   lemy.mx/login?flujo=terapeuta&utm_source=psicowork&utm_medium=email&utm_campaign=alianza
// perdía los utm_* en cuanto la persona pasaba a Google o al correo de
// confirmación — nadie los guardaba, así que no había forma de saber cuántos
// registros trajo cada campaña.
//
// Cómo funciona:
//  1. src/proxy.ts (corre en cada visita) ve utm_* en la URL y guarda UNA
//     cookie propia, "lemy_origen", por 60 días. Solo la primera vez (first
//     touch): si ya existe, no se sobrescribe.
//  2. Al crearse el perfil (ensureProfile) se leen de esa cookie —o de los
//     datos del registro por correo, que los lleva por si la persona confirma
//     su correo desde otro dispositivo— y se guardan en columnas de `profiles`.
//
// La cookie NO es httpOnly a propósito: el formulario de registro por correo
// la lee en el navegador para meterla en los datos del signUp.
//
// El valor va en base64url de un JSON con valores ya limpiados a caracteres
// simples, para no depender de cómo cada capa codifica/decodifica cookies.

export const ORIGEN_COOKIE = "lemy_origen";
export const ORIGEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 días

export type Origen = {
  s?: string; // utm_source
  m?: string; // utm_medium
  c?: string; // utm_campaign
  ct?: string; // utm_content
  t?: string; // utm_term
  p?: string; // primera página visitada (solo la ruta, sin parámetros)
  r?: string; // sitio de donde venía (solo el dominio)
  at: string; // cuándo se capturó (ISO)
};

const MAX_LEN = 80;

// Deja solo caracteres simples y acota el largo: estos valores vienen de la
// URL (cualquiera puede escribir lo que quiera ahí) y se guardan en la base
// de datos y se muestran en el panel de admin.
function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().replace(/[^a-zA-Z0-9_.\-~ /]/g, "_").slice(0, MAX_LEN);
  return v || undefined;
}

export function sanitizeOrigen(raw: unknown): Origen | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const result: Origen = {
    s: clean(o.s),
    m: clean(o.m),
    c: clean(o.c),
    ct: clean(o.ct),
    t: clean(o.t),
    p: clean(o.p),
    r: clean(o.r),
    at: typeof o.at === "string" && !Number.isNaN(Date.parse(o.at)) ? new Date(o.at).toISOString() : new Date().toISOString(),
  };
  // Sin ningún utm no hay nada que guardar.
  if (!result.s && !result.m && !result.c && !result.ct && !result.t) return null;
  return result;
}

// Arma el origen a partir de una URL de entrada. null si no trae ningún utm_*.
export function buildOrigenFromUrl(url: URL, referrer: string | null): Origen | null {
  const sp = url.searchParams;
  let refHost: string | undefined;
  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      // Una visita que viene de nuestro propio sitio no es un origen externo.
      if (!host.endsWith("lemy.mx")) refHost = host;
    } catch {
      // referrer mal formado: se ignora
    }
  }
  return sanitizeOrigen({
    s: sp.get("utm_source"),
    m: sp.get("utm_medium"),
    c: sp.get("utm_campaign"),
    ct: sp.get("utm_content"),
    t: sp.get("utm_term"),
    p: url.pathname,
    r: refHost,
    at: new Date().toISOString(),
  });
}

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

export function encodeOrigen(origen: Origen): string {
  return toBase64Url(JSON.stringify(origen));
}

export function decodeOrigen(raw: string | null | undefined): Origen | null {
  if (!raw) return null;
  try {
    return sanitizeOrigen(JSON.parse(fromBase64Url(raw)));
  } catch {
    return null;
  }
}

// Solo en el navegador. Primero la cookie; si no hay (por ejemplo, el
// navegador la bloqueó), intenta con los utm que traiga la URL actual.
export function readOrigenInBrowser(): Origen | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${ORIGEN_COOKIE}=`));
  const fromCookie = match ? decodeOrigen(match.slice(ORIGEN_COOKIE.length + 1)) : null;
  if (fromCookie) return fromCookie;
  return buildOrigenFromUrl(new URL(window.location.href), document.referrer || null);
}

// Columnas de `profiles` (migración 0046_origen_de_registro).
export function origenToProfileColumns(o: Origen) {
  return {
    utm_source: o.s ?? null,
    utm_medium: o.m ?? null,
    utm_campaign: o.c ?? null,
    utm_content: o.ct ?? null,
    utm_term: o.t ?? null,
    signup_landing_path: o.p ?? null,
    signup_referrer: o.r ?? null,
    utm_captured_at: o.at,
  };
}

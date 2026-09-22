import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getAccessToken, queryFreeBusy, GoogleCalendarError, type BusyRange } from "@/lib/google-calendar";

// Cuánto tiempo se cachea la consulta a Google antes de volver a pedirla —
// el balance entre "no mostrar un horario que el terapeuta ya ocupó en
// Google" y "no depender de que Google responda rápido en cada visita al
// perfil público". Ver conversación con Gustavo sobre esta decisión
// (2026-09-21): quiere que se sienta prácticamente en tiempo real, así que
// se dejó en 30s en vez de los 180s originales.
//
// OJO — por qué existe redondearAlBalde() más abajo: unstable_cache usa los
// ARGUMENTOS de la función como parte de la llave de caché (además de
// keyParts). rangeStartIso/rangeEndIso venían de `new Date()` con precisión
// de milisegundos, así que cada llamada tenía una llave distinta a la
// anterior — el caché nunca se reutilizaba, cada visita al perfil golpeaba
// a Google en vivo sin ninguna protección, muy distinto de lo que decía
// este comentario. Redondear a baldes de CACHE_SECONDS antes de armar la
// llave es lo que hace que el caché sí sirva de algo.
const CACHE_SECONDS = 30;

function redondearAlBalde(iso: string, bucketMs: number, direction: "down" | "up"): string {
  const ms = new Date(iso).getTime();
  const rounder = direction === "down" ? Math.floor : Math.ceil;
  return new Date(rounder(ms / bucketMs) * bucketMs).toISOString();
}

async function fetchBusyRangesUncached(
  therapistId: string,
  rangeStartIso: string,
  rangeEndIso: string
): Promise<BusyRange[]> {
  const serviceClient = createServiceClient();
  try {
    const { data: refreshToken } = await serviceClient.rpc("get_google_refresh_token", {
      p_user_id: therapistId,
    });

    // Sin Calendar conectado — no es un error, simplemente no hay nada que
    // cruzar.
    if (!refreshToken) return [];

    const accessToken = await getAccessToken(refreshToken);
    const busy = await queryFreeBusy(accessToken, rangeStartIso, rangeEndIso);

    // Si antes había quedado marcado como sin permiso de freebusy y esta
    // consulta sí funcionó (reconectó su cuenta), se limpia la bandera.
    await serviceClient
      .from("therapists")
      .update({ google_calendar_freebusy_ok: true })
      .eq("id", therapistId)
      .eq("google_calendar_freebusy_ok", false);

    return busy;
  } catch (err) {
    // 401/403 es específicamente "el token no tiene permiso" — el caso real
    // de quien conectó su cuenta antes de que existiera el scope
    // calendar.freebusy (ver google-login-button.tsx). A diferencia de
    // antes, esto ya NO se traga en silencio: se marca en `therapists` para
    // que el terapeuta vea un aviso claro en su perfil de que tiene que
    // reconectar Google, en vez de que Lemy siga mostrando "conectado"
    // mientras en realidad nunca está leyendo su calendario real.
    const isPermissionError =
      err instanceof GoogleCalendarError && (err.status === 401 || err.status === 403);

    if (isPermissionError) {
      await serviceClient
        .from("therapists")
        .update({ google_calendar_freebusy_ok: false })
        .eq("id", therapistId);
    }

    // De cualquier forma fallamos "abierto" para no tronar el perfil
    // público por una falla externa: mostramos horarios según lo que Lemy
    // ya sabe (Supabase), sin cruzar Google esta vez.
    console.error(`Error consultando freebusy de Google para terapeuta ${therapistId}:`, err);
    return [];
  }
}

const cachedFetchBusyRanges = unstable_cache(
  fetchBusyRangesUncached,
  ["therapist-google-freebusy"],
  { revalidate: CACHE_SECONDS }
);

// Punto de entrada real — redondea el rango de búsqueda a "baldes" del
// mismo tamaño que CACHE_SECONDS antes de pasarlo a la función cacheada,
// para que la llave de caché sea estable dentro de esa ventana (ver
// comentario de CACHE_SECONDS arriba). rangeStart se redondea hacia abajo y
// rangeEnd hacia arriba — el rango consultado a Google queda ligeramente
// más ancho, nunca más angosto, así que nunca se pierde información real.
export async function getBusyRanges(
  therapistId: string,
  rangeStartIso: string,
  rangeEndIso: string
): Promise<BusyRange[]> {
  const bucketMs = CACHE_SECONDS * 1000;
  const bucketedStart = redondearAlBalde(rangeStartIso, bucketMs, "down");
  const bucketedEnd = redondearAlBalde(rangeEndIso, bucketMs, "up");
  return cachedFetchBusyRanges(therapistId, bucketedStart, bucketedEnd);
}

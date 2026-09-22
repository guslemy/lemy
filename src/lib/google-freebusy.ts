import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getAccessToken, queryFreeBusy, GoogleCalendarError, type BusyRange } from "@/lib/google-calendar";

// Cuánto tiempo se cachea la consulta a Google antes de volver a pedirla —
// el balance entre "no mostrar un horario que el terapeuta ya ocupó en
// Google" y "no depender de que Google responda rápido en cada visita al
// perfil público". Ver conversación con Gustavo sobre esta decisión.
const CACHE_SECONDS = 180;

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

export const getBusyRanges = unstable_cache(fetchBusyRangesUncached, ["therapist-google-freebusy"], {
  revalidate: CACHE_SECONDS,
});

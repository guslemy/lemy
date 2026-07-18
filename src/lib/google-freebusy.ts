import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getAccessToken, queryFreeBusy, type BusyRange } from "@/lib/google-calendar";

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
  try {
    const serviceClient = createServiceClient();
    const { data: refreshToken } = await serviceClient.rpc("get_google_refresh_token", {
      p_user_id: therapistId,
    });

    // Sin Calendar conectado, o conectado antes de que existiera el scope
    // de freebusy — no es un error, simplemente no hay nada que cruzar.
    if (!refreshToken) return [];

    const accessToken = await getAccessToken(refreshToken);
    return await queryFreeBusy(accessToken, rangeStartIso, rangeEndIso);
  } catch (err) {
    // Fallamos "abierto": si Google no responde, el token no tiene el scope
    // nuevo, o cualquier otra falla externa, el perfil público sigue
    // mostrando horarios según lo que Lemy ya sabe — nunca se rompe la
    // página por una falla de un servicio de terceros.
    console.error(`Error consultando freebusy de Google para terapeuta ${therapistId}:`, err);
    return [];
  }
}

export const getBusyRanges = unstable_cache(fetchBusyRangesUncached, ["therapist-google-freebusy"], {
  revalidate: CACHE_SECONDS,
});

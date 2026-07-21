// Llamadas directas a la API de Google (sin librería googleapis, para no
// cargar un SDK enorme por dos endpoints). Usa el mismo GOOGLE_CLIENT_ID /
// GOOGLE_CLIENT_SECRET que Supabase Auth usa para el login con Google — el
// refresh token que guardamos en Etapa A se emitió contra ese mismo cliente.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

export class GoogleCalendarError extends Error {}

// Intercambia el refresh token guardado por un access token de corta
// duración. Se hace en cada confirmación — no cacheamos el access token en
// ningún lado, es desechable y expira en ~1h.
export async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new GoogleCalendarError(`No se pudo renovar el access token de Google: ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export type CreateCalendarEventInput = {
  accessToken: string;
  summary: string;
  description: string;
  startIso: string; // ISO UTC
  endIso: string; // ISO UTC
  therapistEmail: string;
  patientEmail: string;
  modality: "online" | "presencial";
  location?: string | null; // dirección — solo se usa (y solo tiene sentido) si modality es "presencial"
};

export type CreateCalendarEventResult = {
  eventId: string;
  meetingLink: string | null;
};

// Crea el evento en el calendario del terapeuta (el dueño del refresh token)
// e invita al paciente por correo. Solo pide Google Meet autogenerado si la
// sesión es en línea — una cita presencial no debe traer un link de
// videollamada que confunda a nadie sobre dónde es realmente la sesión.
export async function createCalendarEvent(
  input: CreateCalendarEventInput
): Promise<CreateCalendarEventResult> {
  const requestId = `lemy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const isOnline = input.modality === "online";

  const res = await fetch(
    `${EVENTS_URL}?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startIso },
        end: { dateTime: input.endIso },
        attendees: [{ email: input.therapistEmail }, { email: input.patientEmail }],
        ...(input.location ? { location: input.location } : {}),
        ...(isOnline
          ? {
              conferenceData: {
                createRequest: {
                  requestId,
                  conferenceSolutionKey: { type: "hangoutsMeet" },
                },
              },
            }
          : {}),
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new GoogleCalendarError(`No se pudo crear el evento en Google Calendar: ${body}`);
  }

  const data = (await res.json()) as {
    id: string;
    conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
    hangoutLink?: string;
  };

  const meetEntry = data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");

  return {
    eventId: data.id,
    meetingLink: meetEntry?.uri ?? data.hangoutLink ?? null,
  };
}

export type BusyRange = { start: string; end: string };

// Consulta qué rangos aparecen como "ocupado" en el calendario principal
// del terapeuta — sin ver títulos ni detalles de esos eventos, solo los
// intervalos. Requiere el scope calendar.freebusy (ver google-login-button.tsx).
export async function queryFreeBusy(
  accessToken: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<BusyRange[]> {
  const res = await fetch(FREEBUSY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      items: [{ id: "primary" }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new GoogleCalendarError(`No se pudo consultar freebusy de Google Calendar: ${body}`);
  }

  const data = (await res.json()) as {
    calendars?: Record<string, { busy?: BusyRange[] }>;
  };

  return data.calendars?.primary?.busy ?? [];
}

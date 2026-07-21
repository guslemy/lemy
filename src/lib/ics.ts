// Genera un archivo .ics (RFC 5545) mínimo para una sola sesión — funciona
// como adjunto de correo que Gmail, Outlook, Apple Mail y prácticamente
// cualquier cliente reconocen y ofrecen agregar al calendario, sin depender
// de que la persona tenga una cuenta de Google conectada a Lemy.

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export type IcsEventInput = {
  uid: string;
  summary: string;
  description: string;
  location: string | null;
  startIso: string;
  endIso: string;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  attendeeName: string;
};

export function buildIcsEvent(input: IcsEventInput): string {
  const now = toIcsUtc(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lemy//Citas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${input.uid}@lemy.mx`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsUtc(input.startIso)}`,
    `DTEND:${toIcsUtc(input.endIso)}`,
    `SUMMARY:${escapeIcsText(input.summary)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    ...(input.location ? [`LOCATION:${escapeIcsText(input.location)}`] : []),
    `ORGANIZER;CN=${escapeIcsText(input.organizerName)}:mailto:${input.organizerEmail}`,
    `ATTENDEE;CN=${escapeIcsText(input.attendeeName)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${input.attendeeEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

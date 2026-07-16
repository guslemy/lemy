// Envío real vía WhatsApp Cloud API (Meta), directo — sin BSP intermediario.
// Queda "listo pero inactivo" hasta que Gustavo termine la verificación de
// negocio en Meta y me pase WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN.
// Los recordatorios proactivos (fuera de la ventana de 24h de conversación)
// SIEMPRE tienen que usar un "template" ya aprobado por Meta — no se puede
// mandar texto libre. Los nombres de plantilla usados aquí deben existir y
// estar aprobados en WhatsApp Manager con esos mismos nombres.

const GRAPH_API_VERSION = "v21.0";

export class WhatsAppNotConfiguredError extends Error {
  constructor() {
    super("WhatsApp no está configurado todavía (falta WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN).");
    this.name = "WhatsAppNotConfiguredError";
  }
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

// `to` debe ser un número en formato E.164 sin el "+" (ej. 529511234567).
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParams: string[]
): Promise<void> {
  if (!isWhatsAppConfigured()) throw new WhatsAppNotConfiguredError();

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "es_MX" },
          components: bodyParams.length
            ? [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }]
            : undefined,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Envío de WhatsApp falló (${templateName} → ${to}): ${body}`);
  }
}

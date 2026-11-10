import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWhatsAppText, isWhatsAppConfigured } from "@/lib/whatsapp";

// Webhook de WhatsApp Cloud API (Meta). Meta le avisa a esta dirección cuando:
//  - alguien le responde a Lemy por WhatsApp (mensajes entrantes), y
//  - cambia el estado de un mensaje que mandamos (entregado, leído, falló).
//
// Qué hace con lo que recibe:
//  - "BAJA" (o similar): apaga el permiso de WhatsApp de esa persona
//    (profiles.whatsapp_opt_in = false) y le confirma por el mismo chat.
//  - "ALTA": lo vuelve a encender (que la persona lo pida desde SU número es
//    un consentimiento válido).
//  - Cualquier otro texto de alguien que tiene cuenta: respuesta automática
//    diciendo que este número es solo de avisos y cómo contactar al equipo.
//  - Estados "failed": se anotan en los logs de Vercel con el motivo de Meta.
//
// Se configura en Meta (app → WhatsApp → Configuración → Webhooks) con esta URL
// y el mismo texto de verificación que WHATSAPP_VERIFY_TOKEN. WHATSAPP_APP_SECRET
// (app → Configuración → Básica → "Clave secreta") se usa para comprobar que
// cada petición viene de verdad de Meta (firma X-Hub-Signature-256).

export const dynamic = "force-dynamic";

const OPT_OUT_WORDS = new Set([
  "baja",
  "stop",
  "parar",
  "cancelar",
  "alto",
  "no mas",
  "dar de baja",
  "darme de baja",
  "unsubscribe",
  "no quiero",
]);
const OPT_IN_WORDS = new Set(["alta", "reactivar", "activar"]);

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Cuentas cuyo teléfono (en cualquier formato guardado) termina en los mismos
// 10 dígitos que el número de WhatsApp que escribió. Se compara en memoria
// porque los teléfonos están guardados tal cual los escribió cada quien
// ("951 123 4567", "+52 951…"). Es una consulta pequeña a la escala actual y
// solo se dispara cuando alguien responde.
async function profilesByPhone(from: string): Promise<{ id: string; full_name: string | null }[]> {
  const last10 = from.replace(/\D/g, "").slice(-10);
  if (last10.length < 10) return [];
  const supabase = createServiceClient();
  const { data } = await supabase.from("profiles").select("id, full_name, phone").not("phone", "is", null);
  return (data ?? [])
    .filter((p) => String(p.phone).replace(/\D/g, "").slice(-10) === last10)
    .map((p) => ({ id: p.id as string, full_name: (p.full_name as string | null) ?? null }));
}

type WaMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string } };
};

type WaStatus = { id?: string; status?: string; recipient_id?: string; errors?: unknown[] };

async function handleIncoming(message: WaMessage) {
  const from = message.from ?? "";
  const body = message.text?.body ?? message.button?.text ?? message.interactive?.button_reply?.title ?? "";
  if (!from || !body) return; // audios, imágenes, etc.: no se responde automático

  const words = normalize(body);
  const supabase = createServiceClient();
  const profiles = await profilesByPhone(from);
  const reply = async (text: string) => {
    if (!isWhatsAppConfigured()) return;
    try {
      await sendWhatsAppText(from, text);
    } catch (err) {
      console.error("Error respondiendo por WhatsApp:", err);
    }
  };

  const isOptOut = OPT_OUT_WORDS.has(words) || words.startsWith("baja ") || words === "baja";
  const isOptIn = OPT_IN_WORDS.has(words);

  if (isOptOut) {
    if (profiles.length) {
      await supabase
        .from("profiles")
        .update({ whatsapp_opt_in: false, whatsapp_opt_out_at: new Date().toISOString() })
        .in(
          "id",
          profiles.map((p) => p.id)
        );
    }
    await reply(
      profiles.length
        ? "Listo, ya no recibirás avisos de Lemy por WhatsApp. Si cambias de opinión, responde ALTA o actívalos en lemy.mx/dashboard."
        : "No encontramos una cuenta de Lemy con este número, así que no hay avisos que desactivar. Si crees que es un error, escríbenos a hola@lemy.mx."
    );
    return;
  }

  if (isOptIn) {
    if (profiles.length) {
      await supabase
        .from("profiles")
        .update({ whatsapp_opt_in: true, whatsapp_opt_in_at: new Date().toISOString() })
        .in(
          "id",
          profiles.map((p) => p.id)
        );
      await reply("Listo, volverás a recibir avisos de Lemy por WhatsApp. Para dejar de recibirlos, responde BAJA.");
    }
    return;
  }

  // Cualquier otro texto: solo se responde a quien tiene cuenta (evita
  // contestarle a números desconocidos).
  if (profiles.length) {
    await reply(
      "Hola, este número solo manda avisos automáticos de Lemy y no atendemos mensajes por aquí. Para ayuda escríbenos a hola@lemy.mx. Para dejar de recibir avisos por WhatsApp, responde BAJA."
    );
  }
}

// Meta verifica la dirección con una petición GET al darla de alta.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    expected &&
    searchParams.get("hub.mode") === "subscribe" &&
    searchParams.get("hub.verify_token") === expected
  ) {
    return new NextResponse(searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  // Sin la clave secreta no hay forma de comprobar que viene de Meta: se
  // rechaza todo (nunca actuar sobre una petición sin verificar).
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return new NextResponse("Not configured", { status: 503 });

  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const valid =
    signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return new NextResponse("Invalid signature", { status: 401 });

  try {
    const payload = JSON.parse(raw) as {
      entry?: { changes?: { value?: { messages?: WaMessage[]; statuses?: WaStatus[] } }[] }[];
    };
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const status of change.value?.statuses ?? []) {
          if (status.status === "failed") {
            console.error(
              `WhatsApp no entregado (→ ${status.recipient_id}):`,
              JSON.stringify(status.errors ?? [])
            );
          }
        }
        for (const message of change.value?.messages ?? []) {
          await handleIncoming(message);
        }
      }
    }
  } catch (err) {
    // Siempre se responde 200 a Meta una vez verificada la firma; si no, la
    // reintenta una y otra vez. El error queda en los logs.
    console.error("Error procesando webhook de WhatsApp:", err);
  }

  return new NextResponse("ok", { status: 200 });
}

import { NextResponse } from "next/server";
import { runNotificationSweep } from "@/lib/notifications/engine";

// IMPORTANTE: sin esto, Next.js cachea la respuesta GET de esta ruta de
// forma estática (no detecta req.headers.get(...) como señal dinámica) y
// serviría siempre la misma respuesta vieja en vez de correr el barrido de
// verdad en cada llamada del cron.
export const dynamic = "force-dynamic";

// Disparado cada 15 min por un workflow de GitHub Actions (ver
// .github/workflows/notifications-cron.yml) — antes usaba el Cron nativo de
// Vercel, pero el plan Hobby (gratis) solo permite cron jobs una vez al día,
// y este barrido necesita correr más seguido para el recordatorio de "tu
// sesión es en 1 hora". El workflow manda el mismo header Authorization
// con el secreto guardado en GitHub — así nadie más puede llamar este
// endpoint y disparar notificaciones a mano.
const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, ...noStore });
  }

  try {
    const result = await runNotificationSweep();
    return NextResponse.json({ ok: true, ...result }, noStore);
  } catch (err) {
    console.error("Error en el barrido de notificaciones:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500, ...noStore });
  }
}

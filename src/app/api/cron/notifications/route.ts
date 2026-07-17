import { NextResponse } from "next/server";
import { runNotificationSweep } from "@/lib/notifications/engine";

// IMPORTANTE: sin esto, Next.js cachea la respuesta GET de esta ruta de
// forma estática (no detecta req.headers.get(...) como señal dinámica) y
// serviría siempre la misma respuesta vieja en vez de correr el barrido de
// verdad en cada llamada del cron.
export const dynamic = "force-dynamic";

// Disparado por Vercel Cron cada 15 min (ver vercel.json). Vercel manda el
// header Authorization automáticamente cuando CRON_SECRET está configurado
// en el proyecto — así nadie más puede llamar este endpoint y disparar
// notificaciones a mano.
const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // TEMPORAL: hasSecret nos dice si la variable de entorno está llegando
    // al runtime, sin revelar su valor. Quitar en cuanto se confirme.
    return NextResponse.json({ error: "unauthorized" }, { status: 401, ...noStore });
  }

  try {
    const result = await runNotificationSweep();
    return NextResponse.json(
      { ok: true, ...result, hasSecret: Boolean(process.env.CRON_SECRET) },
      noStore
    );
  } catch (err) {
    console.error("Error en el barrido de notificaciones:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500, ...noStore });
  }
}

import { NextResponse } from "next/server";
import { runNotificationSweep } from "@/lib/notifications/engine";

// Disparado por Vercel Cron cada 15 min (ver vercel.json). Vercel manda el
// header Authorization automáticamente cuando CRON_SECRET está configurado
// en el proyecto — así nadie más puede llamar este endpoint y disparar
// notificaciones a mano.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runNotificationSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Error en el barrido de notificaciones:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

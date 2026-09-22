"use client";

import { useState } from "react";

// Pop-up bloqueante (sin botón de cerrar a propósito) que le pide al
// terapeuta resolver una sesión ya pasada antes de dejarlo seguir usando
// cualquier parte del dashboard — a petición explícita de Gustavo
// (2026-09-21), para tener datos de asistencia confiables de cara a sus
// estadísticas mensuales. Vive en src/app/dashboard/layout.tsx, así que
// aparece sin importar en qué pestaña/página del dashboard esté el
// terapeuta.
//
// Solo se le pasa UNA cita a la vez (la más antigua sin resolver) — cada
// una de las 3 acciones redirige de vuelta a /dashboard, el layout vuelve a
// calcular qué falta y, si sigue habiendo pendientes, este mismo componente
// se vuelve a montar con la siguiente. No hace falta manejar el avance de
// la fila a mano del lado del cliente: el servidor siempre manda la
// verdad actual.
export type AttendanceGateItem = {
  id: string;
  patientName: string;
  scheduledAtIso: string;
  totalPending: number;
};

const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const OAXACA_UTC_OFFSET_MIN = 6 * 60;

function formatOaxaca(iso: string) {
  const utcMs = new Date(iso).getTime() - OAXACA_UTC_OFFSET_MIN * 60 * 1000;
  const local = new Date(utcMs);
  const weekday = WEEKDAY_LABELS[local.getUTCDay()];
  const d = local.getUTCDate();
  const m = local.getUTCMonth() + 1;
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  return `${weekday} ${d}/${m} · ${hh}:${mm}`;
}

export function AttendanceGate({
  item,
  markCompletedAction,
  rescheduleAction,
  cancelAction,
}: {
  item: AttendanceGateItem;
  markCompletedAction: (formData: FormData) => void;
  rescheduleAction: (formData: FormData) => void;
  cancelAction: (formData: FormData) => void;
}) {
  const [mode, setMode] = useState<"elegir" | "reagendar" | "cancelar">("elegir");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-forest-deep/60 px-4 backdrop-blur-sm">
      <div className="signature-corner w-full max-w-[440px] rounded-[24px] border border-line bg-card p-7">
        {item.totalPending > 1 && (
          <p className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-rose-deep">
            Cita pendiente 1 de {item.totalPending}
          </p>
        )}
        <h3 className="font-display text-[1.2rem] text-forest">¿Cómo salió tu sesión?</h3>
        <p className="mt-2 text-[0.9rem] text-[#3E4B44]">
          Tu sesión con <strong>{item.patientName}</strong> el <strong>{formatOaxaca(item.scheduledAtIso)}</strong> ya
          pasó. Confírmanos qué pasó para seguir usando tu panel.
        </p>

        {mode === "elegir" && (
          <div className="mt-5 flex flex-col gap-2.5">
            <form action={markCompletedAction}>
              <input type="hidden" name="appointment_id" value={item.id} />
              <button
                type="submit"
                className="w-full rounded-full bg-forest px-5 py-2.5 text-[0.9rem] font-semibold text-sage-white transition-colors hover:bg-forest-deep"
              >
                Sí, se llevó a cabo
              </button>
            </form>
            <button
              type="button"
              onClick={() => setMode("reagendar")}
              className="w-full rounded-full border border-line px-5 py-2.5 text-[0.9rem] font-medium text-forest transition-colors hover:border-forest"
            >
              Reagendar
            </button>
            <button
              type="button"
              onClick={() => setMode("cancelar")}
              className="w-full rounded-full border border-line px-5 py-2.5 text-[0.9rem] font-medium text-rose-deep transition-colors hover:border-rose-deep"
            >
              Cancelar cita
            </button>
          </div>
        )}

        {mode === "reagendar" && (
          <form action={rescheduleAction} className="mt-5 flex flex-col gap-3">
            <input type="hidden" name="appointment_id" value={item.id} />
            <label className="block">
              <span className="mb-1.5 block text-[0.82rem] font-medium text-forest">Nuevo horario</span>
              <input type="datetime-local" name="new_scheduled_at" required className="input-lemy" />
            </label>
            <div className="flex gap-2.5">
              <button
                type="submit"
                className="flex-1 rounded-full bg-forest px-5 py-2.5 text-[0.88rem] font-semibold text-sage-white hover:bg-forest-deep"
              >
                Confirmar nuevo horario
              </button>
              <button
                type="button"
                onClick={() => setMode("elegir")}
                className="rounded-full border border-line px-4 py-2.5 text-[0.85rem] text-forest hover:border-forest"
              >
                Atrás
              </button>
            </div>
          </form>
        )}

        {mode === "cancelar" && (
          <form action={cancelAction} className="mt-5 flex flex-col gap-3">
            <input type="hidden" name="appointment_id" value={item.id} />
            <label className="block">
              <span className="mb-1.5 block text-[0.82rem] font-medium text-forest">Motivo (opcional)</span>
              <input type="text" name="reason" placeholder="¿Qué pasó?" className="input-lemy" />
            </label>
            <div className="flex gap-2.5">
              <button
                type="submit"
                className="flex-1 rounded-full bg-rose-deep px-5 py-2.5 text-[0.88rem] font-semibold text-white hover:bg-[#a86356]"
              >
                Confirmar cancelación
              </button>
              <button
                type="button"
                onClick={() => setMode("elegir")}
                className="rounded-full border border-line px-4 py-2.5 text-[0.85rem] text-forest hover:border-forest"
              >
                Atrás
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";

// Versión "a prueba de dummies" del formulario de bloqueo de fechas: en vez
// de dos selectores datetime-local crudos (que Gustavo mismo reportó como
// confusos), separamos fecha y hora, y el caso más común — bloquear un día
// completo — es la opción por default, sin tener que pensar en horas.
export function BlockDatesForm({ action }: { action: (formData: FormData) => void }) {
  const [multiDay, setMultiDay] = useState(false);
  const [allDay, setAllDay] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={action}
      className="signature-corner mt-5 space-y-6 rounded-[28px] border border-line bg-card p-7"
    >
      <div>
        <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">¿Qué día?</span>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="date" name="start_date" min={today} required className="input-lemy" />
          {multiDay && (
            <input type="date" name="end_date" min={today} required className="input-lemy" />
          )}
        </div>
        <label className="mt-2.5 flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={multiDay}
            onChange={(e) => setMultiDay(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-forest"
          />
          <span className="text-[0.85rem] text-[#3E4B44]">Son varios días seguidos (ej. vacaciones)</span>
        </label>
      </div>

      <div className="border-t border-line pt-5">
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            name="all_day"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-forest"
          />
          <span className="text-[0.85rem] font-medium text-forest">Bloquear el día completo</span>
        </label>

        {!allDay && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Desde qué hora</span>
              <input type="time" name="start_time" defaultValue="09:00" required className="input-lemy" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Hasta qué hora</span>
              <input type="time" name="end_time" defaultValue="14:00" required className="input-lemy" />
            </label>
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">
          Motivo (opcional, solo para ti)
        </span>
        <input
          type="text"
          name="reason"
          placeholder="Ej. Vacaciones, comida familiar…"
          className="input-lemy"
        />
      </label>

      <SubmitButton pendingText="Bloqueando…">Bloquear</SubmitButton>
    </form>
  );
}

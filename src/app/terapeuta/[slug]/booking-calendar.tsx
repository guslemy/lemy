"use client";

import { useState } from "react";

// Antes se mostraban TODOS los horarios de las próximas 2 semanas de un
// jalón — abrumador para alguien que llega con poca energía. Ahora se elige
// primero la fecha (una fila de días), y solo entonces aparecen los
// horarios de ese día. Menos que procesar de un vistazo.

export type DaySlots = {
  date: string; // YYYY-MM-DD
  label: string; // ej. "lun 20/7"
  slots: { startTime: string; scheduledAtUtc: string }[];
};

type Modality = "online" | "presencial";

export function BookingCalendar({
  days,
  therapistSlug,
  onlineAvailable,
  inPersonAvailable,
  requestAppointment,
}: {
  days: DaySlots[];
  therapistSlug: string;
  onlineAvailable: boolean;
  inPersonAvailable: boolean;
  requestAppointment: (formData: FormData) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(days[0]?.date ?? null);
  const [modality, setModality] = useState<Modality>(onlineAvailable ? "online" : "presencial");

  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  const modalityOption = (value: Modality, label: string, available: boolean) => (
    <label
      className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[0.82rem] transition-all duration-200 ${
        !available
          ? "cursor-not-allowed border-line bg-sage-white text-[#B7C0BA]"
          : modality === value
            ? "cursor-pointer border-forest bg-forest text-sage-white"
            : "cursor-pointer border-line bg-sage-white text-forest hover:border-forest"
      }`}
    >
      <input
        type="radio"
        name="modality_choice"
        value={value}
        checked={modality === value}
        disabled={!available}
        onChange={() => setModality(value)}
        className="sr-only"
      />
      {label}
    </label>
  );

  return (
    <div>
      <p className="mb-3 text-[0.88rem] text-[#42504A]">¿Cómo prefieres tu sesión?</p>
      <div className="mb-6 flex flex-wrap gap-2.5">
        {modalityOption("online", "En línea", onlineAvailable)}
        {modalityOption("presencial", "Presencial", inPersonAvailable)}
      </div>

      <p className="mb-3 text-[0.88rem] text-[#42504A]">Primero elige el día:</p>
      <div className="flex flex-wrap gap-2.5">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            onClick={() => setSelectedDate(d.date)}
            className={`rounded-full border px-4 py-2 font-mono text-[0.82rem] transition-all duration-200 active:scale-95 ${
              selectedDate === d.date
                ? "border-forest bg-forest text-sage-white"
                : "border-line bg-sage-white text-forest hover:border-forest"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {selectedDay && (
        <div key={selectedDay.date} className="animate-step-in mt-6">
          <p className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-[#5A665F]">
            Horarios para el {selectedDay.label}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {selectedDay.slots.map((slot) => (
              <form key={slot.scheduledAtUtc} action={requestAppointment}>
                <input type="hidden" name="therapist_slug" value={therapistSlug} />
                <input type="hidden" name="scheduled_at" value={slot.scheduledAtUtc} />
                <input type="hidden" name="modality" value={modality} />
                <button
                  type="submit"
                  className="rounded-full border border-line bg-sage-white px-4 py-2 font-mono text-[0.82rem] text-forest transition-all duration-200 active:scale-95 hover:border-forest hover:bg-forest hover:text-sage-white"
                >
                  {slot.startTime}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

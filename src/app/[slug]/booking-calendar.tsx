"use client";

import { useEffect, useState } from "react";

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
  // Cada horario es su propio <form>, sin estado "pending" nativo — sin esto,
  // un doble click (o un click mientras la red va lenta) manda dos
  // solicitudes de golpe, ya que el usuario no tiene ninguna señal de que la
  // primera ya se está procesando. En cuanto se envía cualquiera, se
  // deshabilitan todos los botones de horario hasta que la página navegue.
  // Se guarda CUÁL horario se envió (no solo un booleano) para que "Enviando…"
  // solo aparezca en el botón que de verdad se apretó — los demás solo se
  // ven deshabilitados, sin cambiar de texto.
  const [submittingSlot, setSubmittingSlot] = useState<string | null>(null);

  // Si la reserva falla (horario ocupado, error, etc.), requestAppointment
  // redirige de vuelta a esta misma ruta (/[slug], solo cambian los query
  // params) — Next.js reutiliza esta instancia del componente en vez de
  // desmontarla, así que submittingSlot se quedaba en true para siempre y
  // los botones parecían "atorados" en Enviando. `days` llega recalculado
  // del servidor en cada navegación (nueva referencia aunque el contenido
  // sea igual), así que sirve como señal de "ya se resolvió la navegación,
  // lo que sea que haya pasado" para resetear el estado. En el caso de
  // éxito no importa: la página se va a /gracias y este componente se
  // desmonta por completo.
  useEffect(() => {
    setSubmittingSlot(null);
  }, [days]);

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
              <form
                key={slot.scheduledAtUtc}
                action={requestAppointment}
                onSubmit={() => setSubmittingSlot(slot.scheduledAtUtc)}
              >
                <input type="hidden" name="therapist_slug" value={therapistSlug} />
                <input type="hidden" name="scheduled_at" value={slot.scheduledAtUtc} />
                <input type="hidden" name="modality" value={modality} />
                <button
                  type="submit"
                  disabled={submittingSlot !== null}
                  className="rounded-full border border-line bg-sage-white px-4 py-2 font-mono text-[0.82rem] text-forest transition-all duration-200 active:scale-95 hover:border-forest hover:bg-forest hover:text-sage-white disabled:pointer-events-none disabled:opacity-50"
                >
                  {submittingSlot === slot.scheduledAtUtc ? "Enviando…" : slot.startTime}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

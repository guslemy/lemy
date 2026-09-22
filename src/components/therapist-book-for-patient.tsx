"use client";

import { useEffect, useState } from "react";

// Versión simplificada de BookingCalendar (ver src/app/[slug]/booking-calendar.tsx)
// para cuando es el TERAPEUTA quien agenda directo con un paciente suyo desde
// su ficha (botón "Agendar consulta con este paciente", a petición de
// Gustavo 2026-09-21). Se le quitó todo lo que no aplica en este flujo:
//
// - Sin elegir método de pago aquí — el paciente decide eso hasta que
//   acepta la propuesta (ver acceptTherapistAppointment en
//   dashboard/mis-citas/actions.ts), no en el momento en que el terapeuta
//   elige el horario.
// - El popup de confirmación dice "agendar PARA <paciente>", no "solicitar".
// - Colapsado por default (empieza oculto detrás de un botón) — la ficha ya
//   tiene suficiente contenido arriba (notas, historial clínico) como para
//   mostrar el calendario completo siempre abierto.

export type BookForPatientDaySlots = {
  date: string;
  label: string;
  slots: { startTime: string; scheduledAtUtc: string }[];
};

export type BookForPatientService = {
  id: string;
  nombre: string;
  price: number;
  durationMin: number;
};

type Modality = "online" | "presencial";

export function TherapistBookForPatient({
  patientId,
  patientName,
  daysByDuration,
  legacyDurationMin,
  services,
  onlineAvailable,
  inPersonAvailable,
  createAppointmentAction,
}: {
  patientId: string;
  patientName: string;
  daysByDuration: Record<number, BookForPatientDaySlots[]>;
  legacyDurationMin: number;
  services: BookForPatientService[];
  onlineAvailable: boolean;
  inPersonAvailable: boolean;
  createAppointmentAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasServices = services.length > 0;
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(hasServices ? null : "legacy");
  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;
  const activeDurationMin = selectedService?.durationMin ?? legacyDurationMin;
  const days = hasServices
    ? selectedService
      ? (daysByDuration[activeDurationMin] ?? [])
      : []
    : (daysByDuration[legacyDurationMin] ?? []);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modality, setModality] = useState<Modality>(onlineAvailable ? "online" : "presencial");
  const [pendingSlot, setPendingSlot] = useState<{ startTime: string; scheduledAtUtc: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedDate(days[0]?.date ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId]);

  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-full bg-forest px-5 py-2.5 text-[0.88rem] font-semibold text-sage-white transition-colors hover:bg-forest-deep"
      >
        Agendar consulta con este paciente
      </button>
    );
  }

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
    <div className="mt-6 border-t border-line pt-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">
          Agendar consulta con {patientName}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[0.78rem] font-medium text-[#8B978F] hover:text-forest"
        >
          Cerrar
        </button>
      </div>

      {hasServices && (
        <div className="mb-6">
          <p className="mb-3 text-[0.88rem] text-[#42504A]">Primero elige el servicio:</p>
          <div className="flex flex-wrap gap-2.5">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedServiceId(s.id)}
                className={`rounded-full border px-4 py-2 font-mono text-[0.82rem] transition-all duration-200 active:scale-95 ${
                  selectedServiceId === s.id
                    ? "border-forest bg-forest text-sage-white"
                    : "border-line bg-sage-white text-forest hover:border-forest"
                }`}
              >
                {s.nombre} · ${Math.round(s.price)} MXN · {s.durationMin} min
              </button>
            ))}
          </div>
        </div>
      )}

      {(!hasServices || selectedService) && (
        <>
          <p className="mb-3 text-[0.88rem] text-[#42504A]">¿Modalidad de la sesión?</p>
          <div className="mb-6 flex flex-wrap gap-2.5">
            {modalityOption("online", "En línea", onlineAvailable)}
            {modalityOption("presencial", "Presencial", inPersonAvailable)}
          </div>

          {days.length === 0 ? (
            <p className="text-[0.9rem] text-[#8B978F]">No tienes horarios disponibles para esta duración por ahora.</p>
          ) : (
            <>
              <p className="mb-3 text-[0.88rem] text-[#42504A]">Elige el día:</p>
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
            </>
          )}

          {selectedDay && (
            <div key={selectedDay.date} className="animate-step-in mt-6">
              <p className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-[#5A665F]">
                Horarios para el {selectedDay.label}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {selectedDay.slots.map((slot) => (
                  <button
                    key={slot.scheduledAtUtc}
                    type="button"
                    onClick={() => setPendingSlot(slot)}
                    className="rounded-full border border-line bg-sage-white px-4 py-2 font-mono text-[0.82rem] text-forest transition-all duration-200 active:scale-95 hover:border-forest hover:bg-forest hover:text-sage-white"
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {pendingSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-deep/40 px-4"
          onClick={() => !submitting && setPendingSlot(null)}
        >
          <div
            className="signature-corner w-full max-w-[420px] rounded-[24px] border border-line bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-rose-deep">Confirma la cita</p>
            <h3 className="mt-2 font-display text-[1.15rem] text-forest">
              {selectedDay?.label} · {pendingSlot.startTime}
            </h3>

            <div className="mt-4 space-y-1.5 text-[0.88rem] text-[#3E4B44]">
              <p>
                <span className="font-medium">Con:</span> {patientName}
              </p>
              {selectedService && (
                <p>
                  <span className="font-medium">Servicio:</span> {selectedService.nombre}
                </p>
              )}
              <p>
                <span className="font-medium">Modalidad:</span> {modality === "online" ? "En línea" : "Presencial"}
              </p>
            </div>

            <p className="mt-4 text-[0.8rem] text-[#7C877F]">
              {patientName.split(" ")[0]} recibirá un aviso y tendrá 24 horas para aceptar o rechazar esta cita.
              Mientras tanto, el horario queda apartado.
            </p>

            <form
              action={createAppointmentAction}
              onSubmit={() => setSubmitting(true)}
              className="mt-5 flex items-center gap-3"
            >
              <input type="hidden" name="patient_id" value={patientId} />
              <input type="hidden" name="scheduled_at" value={pendingSlot.scheduledAtUtc} />
              <input type="hidden" name="modality" value={modality} />
              <input type="hidden" name="therapist_service_id" value={selectedService ? selectedService.id : ""} />
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-forest px-4 py-2 font-mono text-[0.82rem] text-sage-white transition-all duration-200 hover:bg-forest-deep disabled:pointer-events-none disabled:opacity-60"
              >
                {submitting ? "Enviando…" : "Agendar"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setPendingSlot(null)}
                className="rounded-full border border-line px-4 py-2 font-mono text-[0.82rem] text-[#8B978F] hover:border-forest hover:text-forest disabled:pointer-events-none disabled:opacity-60"
              >
                Volver
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

// Dos widgets chicos que necesitan estado local: el popup de datos del
// paciente (abrir/cerrar) y el formulario de reagendar (mostrar/ocultar el
// selector de fecha). Viven en un solo archivo cliente porque ambos son
// pequeños y solo se usan en /dashboard/citas.

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

export type PatientPopupInfo = {
  email: string | null;
  phone: string | null;
  lastAppointmentIso: string | null;
  notes: string | null;
};

export function PatientInfoPopup({
  patientId,
  name,
  info,
  saveNotesAction,
}: {
  patientId: string;
  name: string;
  info: PatientPopupInfo;
  saveNotesAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-medium text-forest underline decoration-forest/30 underline-offset-2 hover:decoration-forest"
      >
        {name}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-deep/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="signature-corner w-full max-w-[420px] rounded-[24px] border border-line bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[1.15rem] text-forest">{name}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#8B978F] hover:text-forest"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-1.5 text-[0.88rem] text-[#3E4B44]">
              <p>
                <span className="font-medium">Correo:</span> {info.email ?? "—"}
              </p>
              <p>
                <span className="font-medium">Teléfono:</span> {info.phone ?? "—"}
              </p>
              <p>
                <span className="font-medium">Última cita:</span>{" "}
                {info.lastAppointmentIso ? formatOaxaca(info.lastAppointmentIso) : "—"}
              </p>
            </div>

            <form action={saveNotesAction} className="mt-4">
              <input type="hidden" name="patient_id" value={patientId} />
              <label className="mb-1.5 block font-mono text-[0.7rem] uppercase tracking-[0.08em] text-rose-deep">
                Notas privadas
              </label>
              <textarea
                name="notes"
                defaultValue={info.notes ?? ""}
                rows={3}
                placeholder="Solo tú puedes ver esto…"
                className="input-lemy w-full resize-none text-[0.88rem]"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <Link
                  href={`/dashboard/pacientes/${patientId}`}
                  className="text-[0.82rem] font-semibold text-rose-deep underline"
                >
                  Ver perfil completo →
                </Link>
                <button
                  type="submit"
                  className="rounded-full bg-forest px-4 py-1.5 text-[0.82rem] font-semibold text-sage-white hover:bg-forest-deep"
                >
                  Guardar notas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function RescheduleForm({
  appointmentId,
  rescheduleAction,
}: {
  appointmentId: string;
  rescheduleAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-line px-3.5 py-1.5 font-mono text-[0.78rem] text-[#8B978F] hover:border-forest hover:text-forest"
      >
        Reagendar
      </button>
    );
  }

  return (
    <form action={rescheduleAction} className="flex items-center gap-2">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <input
        type="datetime-local"
        name="new_scheduled_at"
        required
        className="input-lemy py-1.5 text-[0.8rem]"
      />
      <button
        type="submit"
        className="rounded-full bg-forest px-3.5 py-1.5 font-mono text-[0.78rem] text-sage-white hover:bg-forest-deep"
      >
        Confirmar
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-[0.78rem] text-[#8B978F] hover:text-forest"
      >
        Cancelar
      </button>
    </form>
  );
}

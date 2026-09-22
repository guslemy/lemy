"use client";

import { useState, useTransition } from "react";
import { searchOwnPatients, linkPreviousPatient, unlinkPreviousPatient } from "@/app/dashboard/pacientes/ficha-actions";
import type { HistoryLinkSummary } from "@/lib/clinical-record";

// "Vincular con paciente anterior" — cuando alguien cierra su cuenta de
// Lemy y luego regresa (nueva cuenta, nuevo id), el terapeuta puede ligar
// el registro nuevo con uno propio anterior para ver su historial en modo
// lectura, sin fusionar los datos (ver conversación del 2026-09-22).
export function LinkPreviousPatient({
  patientId,
  existingLink,
}: {
  patientId: string;
  existingLink: HistoryLinkSummary | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ patient_id: string; full_name: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const r = await searchOwnPatients(value);
      setResults(r.filter((p) => p.patient_id !== patientId));
    });
  }

  if (existingLink) {
    return (
      <div className="mb-6 rounded-[14px] border border-line bg-forest/[0.05] px-5 py-4">
        <p className="text-[0.86rem] text-forest">
          Vinculado con un registro anterior: <strong>{existingLink.linkedFullName ?? "paciente anterior"}</strong>{" "}
          ({existingLink.finalizedNotesCount} nota{existingLink.finalizedNotesCount === 1 ? "" : "s"} de sesión
          previa{existingLink.finalizedNotesCount === 1 ? "" : "s"}).
        </p>
        <form action={unlinkPreviousPatient} className="mt-2">
          <input type="hidden" name="patient_id" value={patientId} />
          <button type="submit" className="text-[0.8rem] text-[#8B978F] hover:text-rose-deep">
            Quitar vínculo
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-[0.85rem] font-semibold text-forest hover:underline">
          ¿Ya atendiste a este paciente antes? Vincular con paciente anterior
        </button>
      ) : (
        <div className="rounded-[14px] border border-line bg-sage-white p-4">
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre entre tus pacientes anteriores…"
            className="input-lemy"
          />
          {isPending && <p className="mt-2 text-[0.8rem] text-[#8B978F]">Buscando…</p>}
          {results.map((r) => (
            <form key={r.patient_id} action={linkPreviousPatient} className="mt-2 flex items-center justify-between">
              <input type="hidden" name="patient_id" value={patientId} />
              <input type="hidden" name="linked_patient_id" value={r.patient_id} />
              <span className="text-[0.88rem] text-[#37433D]">{r.full_name ?? "Paciente"}</span>
              <button type="submit" className="rounded-full border border-forest px-3.5 py-1 text-[0.8rem] font-semibold text-forest">
                Vincular
              </button>
            </form>
          ))}
          <button type="button" onClick={() => setOpen(false)} className="mt-3 text-[0.8rem] text-[#8B978F]">
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

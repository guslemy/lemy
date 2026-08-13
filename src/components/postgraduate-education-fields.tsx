"use client";

import { useState } from "react";
import { GRADOS_POSGRADO } from "@/lib/perfil-catalogos";

export type PostgraduateRow = {
  degree_type: string;
  program_name: string;
  institution: string;
  completion_year: number | null;
  license_number: string | null;
};

let nextKey = 0;
function newRow(): PostgraduateRow & { key: number } {
  nextKey += 1;
  return {
    key: nextKey,
    degree_type: "",
    program_name: "",
    institution: "",
    completion_year: null,
    license_number: null,
  };
}

// "Formación de posgrado" del Notion — repetible ("+ Agregar otro estudio").
// Todas las filas de una misma columna comparten el mismo `name`, así que en
// el servidor formData.getAll("pg_program_name") etc. regresan arreglos
// paralelos en el mismo orden — no hace falta indexar nombres con []. Ver
// saveTherapistProfile en dashboard/actions.ts.
export function PostgraduateEducationFields({ initialRows }: { initialRows: PostgraduateRow[] }) {
  const [rows, setRows] = useState(() =>
    initialRows.length
      ? initialRows.map((r) => ({ ...r, key: (nextKey += 1) }))
      : [newRow()]
  );

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.key} className="rounded-2xl border border-line p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[0.8rem] font-medium text-forest">Grado académico</span>
              <select name="pg_degree_type" defaultValue={row.degree_type} className="input-lemy">
                <option value="">Selecciona…</option>
                {GRADOS_POSGRADO.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.8rem] font-medium text-forest">Nombre del programa</span>
              <input name="pg_program_name" defaultValue={row.program_name} className="input-lemy" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.8rem] font-medium text-forest">Institución</span>
              <input name="pg_institution" defaultValue={row.institution} className="input-lemy" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.8rem] font-medium text-forest">Año de conclusión</span>
              <input
                type="number"
                name="pg_completion_year"
                defaultValue={row.completion_year ?? ""}
                className="input-lemy"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[0.8rem] font-medium text-forest">
                # de cédula profesional (si aplica)
              </span>
              <input
                name="pg_license_number"
                defaultValue={row.license_number ?? ""}
                className="input-lemy"
              />
            </label>
          </div>

          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              className="mt-3 text-[0.78rem] text-rose-deep underline underline-offset-2"
            >
              ✕ Quitar este estudio
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, newRow()])}
        className="rounded-full border border-forest/30 px-4 py-1.5 text-[0.82rem] font-medium text-forest hover:bg-forest/[0.06]"
      >
        ➕ Agregar otro estudio
      </button>
    </div>
  );
}

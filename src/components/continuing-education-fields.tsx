"use client";

import { useState } from "react";
import { TIPOS_FORMACION_CONTINUA } from "@/lib/perfil-catalogos";

export type ContinuingEducationRow = {
  education_type: string;
  name: string;
  institution: string | null;
  year: number | null;
  hours: number | null;
};

let nextKey = 0;
function newRow(): ContinuingEducationRow & { key: number } {
  nextKey += 1;
  return { key: nextKey, education_type: "", name: "", institution: null, year: null, hours: null };
}

// "Formación continua" del Notion — repetible, mismo mecanismo de arreglos
// paralelos que PostgraduateEducationFields (ver ese archivo para el
// porqué). El campo "Documento comprobatorio" del Notion se deja fuera a
// propósito por ahora — ver nota en la migración 0029.
export function ContinuingEducationFields({
  initialRows,
}: {
  initialRows: ContinuingEducationRow[];
}) {
  const [rows, setRows] = useState(() =>
    initialRows.length ? initialRows.map((r) => ({ ...r, key: (nextKey += 1) })) : [newRow()]
  );

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.key} className="rounded-2xl border border-line p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[0.8rem] font-medium text-forest">Tipo</span>
              <select name="ce_education_type" defaultValue={row.education_type} className="input-lemy">
                <option value="">Selecciona…</option>
                {TIPOS_FORMACION_CONTINUA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.8rem] font-medium text-forest">
                Nombre de la formación
              </span>
              <input name="ce_name" defaultValue={row.name} className="input-lemy" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.8rem] font-medium text-forest">Institución</span>
              <input name="ce_institution" defaultValue={row.institution ?? ""} className="input-lemy" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.8rem] font-medium text-forest">Año</span>
              <input type="number" name="ce_year" defaultValue={row.year ?? ""} className="input-lemy" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.8rem] font-medium text-forest">
                Horas de formación (opcional)
              </span>
              <input
                type="number"
                name="ce_hours"
                defaultValue={row.hours ?? ""}
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
              ✕ Quitar esta formación
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, newRow()])}
        className="rounded-full border border-forest/30 px-4 py-1.5 text-[0.82rem] font-medium text-forest hover:bg-forest/[0.06]"
      >
        ➕ Agregar otra formación
      </button>
    </div>
  );
}

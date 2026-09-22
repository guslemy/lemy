"use client";

import { useMemo, useState, useTransition } from "react";
import { saveSessionNote, addSessionNoteAddendum, saveCustomField } from "@/app/dashboard/pacientes/ficha-actions";
import type { SessionNoteRow } from "@/lib/clinical-record";
import type { DynamicField } from "@/lib/clinical-record-crypto";

// Catálogo de campos sugeridos por FAMILIA de enfoque (las 8 categorías del
// catálogo de enfoques terapéuticos — no por cada enfoque específico, ver
// migración 0028 y la conversación del 2026-09-22 con Gustavo). Los 4
// primeros bloques ya reflejan el catálogo del mockup original; los otros 4
// (Contextuales, Basadas en Trauma, Neuropsicológicas, Otros) SON BORRADOR
// escrito por Claude — mismo criterio que otros catálogos de este proyecto
// (ver 0027/0028) — pendientes de validar con Gustavo y sus terapeutas
// piloto antes de darlos por definitivos.
const ENFOQUE_FAMILIAS = [
  "Humanistas",
  "Cognitivo-Conductuales",
  "Psicodinámicos",
  "Sistémicos",
  "Contextuales",
  "Basadas en Trauma",
  "Neuropsicológicas",
  "Otros",
] as const;

const CAMPOS_POR_FAMILIA: Record<string, string[]> = {
  Humanistas: ["Experiencia en el aquí y ahora", "Toma de conciencia (awareness)", "Congruencia y autenticidad", "Fortalezas y recursos personales"],
  "Cognitivo-Conductuales": ["Pensamientos automáticos", "Emociones", "Conductas", "Reestructuración cognitiva", "Tareas"],
  Psicodinámicos: ["Asociaciones relevantes", "Mecanismos de defensa", "Transferencia", "Interpretación"],
  Sistémicos: ["Dinámica familiar o de pareja", "Patrones de interacción", "Alianzas y límites", "Tareas sistémicas"],
  Contextuales: ["Valores personales", "Evitación experiencial", "Defusión cognitiva", "Compasión hacia uno mismo"],
  "Basadas en Trauma": ["Activación somática", "Recursos de regulación", "Procesamiento de la experiencia", "Estabilización"],
  Neuropsicológicas: ["Funciones cognitivas evaluadas", "Estrategias compensatorias", "Progreso funcional"],
  Otros: ["Fortalezas identificadas", "Estrategias integradas"],
};

const RISK_LABELS: Record<string, string> = {
  ninguno: "Ninguno",
  a_vigilar: "A vigilar",
  riesgo_alto: "Riesgo alto",
};

function formatDateEs(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export function SessionNotesTab({
  patientId,
  nextSessionNumber,
  defaultEnfoqueFamilia,
  customFields,
  notes,
  therapistDisplayName,
}: {
  patientId: string;
  nextSessionNumber: number;
  defaultEnfoqueFamilia: string | null;
  customFields: { id: string; nombre: string }[];
  notes: SessionNoteRow[];
  therapistDisplayName: string;
}) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedFamilias, setSelectedFamilias] = useState<Set<string>>(
    new Set(defaultEnfoqueFamilia ? [defaultEnfoqueFamilia] : [])
  );
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [riskLevel, setRiskLevel] = useState<"ninguno" | "a_vigilar" | "riesgo_alto">("ninguno");
  const [showCustomFieldForm, setShowCustomFieldForm] = useState(false);
  const [customFieldName, setCustomFieldName] = useState("");
  const [saveCustomFieldChecked, setSaveCustomFieldChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [addendumOpenFor, setAddendumOpenFor] = useState<string | null>(null);

  const availableChips = useMemo(() => {
    const chips: { key: string; nombre: string }[] = [];
    for (const familia of selectedFamilias) {
      for (const nombre of CAMPOS_POR_FAMILIA[familia] ?? []) {
        chips.push({ key: `${familia}::${nombre}`, nombre });
      }
    }
    for (const cf of customFields) {
      chips.push({ key: `custom::${cf.id}`, nombre: cf.nombre });
    }
    return chips;
  }, [selectedFamilias, customFields]);

  function toggleFamilia(familia: string) {
    setSelectedFamilias((prev) => {
      const next = new Set(prev);
      if (next.has(familia)) next.delete(familia);
      else next.add(familia);
      return next;
    });
  }

  function addField(key: string, nombre: string) {
    if (addedKeys.has(key)) return;
    setAddedKeys((prev) => new Set(prev).add(key));
    setDynamicFields((prev) => [...prev, { nombre, valor: "" }]);
  }

  function removeField(key: string, nombre: string) {
    setAddedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setDynamicFields((prev) => prev.filter((f) => f.nombre !== nombre));
  }

  function updateFieldValue(nombre: string, valor: string) {
    setDynamicFields((prev) => prev.map((f) => (f.nombre === nombre ? { ...f, valor } : f)));
  }

  function resetBuilder() {
    setDynamicFields([]);
    setAddedKeys(new Set());
    setRiskLevel("ninguno");
    setBuilderOpen(false);
  }

  function handleSave(finalize: boolean, formEl: HTMLFormElement) {
    const fd = new FormData(formEl);
    const content = {
      fechaHoraIso: new Date().toISOString(),
      duracionMin: Number(fd.get("duracion")) || 50,
      foco: String(fd.get("foco") || ""),
      observaciones: String(fd.get("observaciones") || ""),
      intervenciones: String(fd.get("intervenciones") || ""),
      acuerdos: String(fd.get("acuerdos") || ""),
      riesgo:
        riskLevel === "ninguno"
          ? undefined
          : {
              tipo: String(fd.get("riesgo_tipo") || ""),
              valoracionRealizada: String(fd.get("riesgo_valoracion") || ""),
              descripcion: String(fd.get("riesgo_descripcion") || ""),
              accionesTomadas: String(fd.get("riesgo_acciones") || ""),
              canalizacionReferencia: String(fd.get("riesgo_canalizacion") || ""),
              seguimientoRequerido: String(fd.get("riesgo_seguimiento") || ""),
            },
      camposDinamicos: dynamicFields,
      addenda: [],
    };

    startTransition(async () => {
      await saveSessionNote({
        patientId,
        finalize,
        riskLevel,
        enfoqueFamilia: Array.from(selectedFamilias).join(", ") || null,
        content,
      });
      resetBuilder();
    });
  }

  function handleAddCustomField() {
    const nombre = customFieldName.trim();
    if (!nombre) return;
    const key = `custom::new::${Date.now()}`;
    addField(key, nombre);
    if (saveCustomFieldChecked) {
      startTransition(async () => {
        await saveCustomField(nombre);
      });
    }
    setCustomFieldName("");
    setShowCustomFieldForm(false);
    setSaveCustomFieldChecked(false);
  }

  function handleAddendum(noteId: string, formEl: HTMLFormElement) {
    const fd = new FormData(formEl);
    const texto = String(fd.get("addendum_texto") || "").trim();
    if (!texto) return;
    startTransition(async () => {
      await addSessionNoteAddendum({ noteId, patientId, texto, autor: therapistDisplayName });
      setAddendumOpenFor(null);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setBuilderOpen((v) => !v)}
        className="mb-5 rounded-full bg-forest px-5 py-2.5 text-[0.88rem] font-semibold text-sage-white hover:bg-forest-deep"
      >
        Crear nota nueva
      </button>

      {builderOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="signature-corner relative mb-7 rounded-[22px] border border-line bg-sage-white p-6"
        >
          <button
            type="button"
            onClick={resetBuilder}
            aria-label="Cerrar constructor de nota"
            className="absolute right-5 top-5 text-[0.8rem] font-medium text-[#8B978F] hover:text-rose-deep"
          >
            × Cerrar
          </button>

          <p className="mb-5 border-b border-dashed border-line pb-4 text-[0.84rem] text-[#5A665F]">
            Formato base para cualquier enfoque. Debajo, agrega solo los campos del enfoque que necesites para
            esta sesión — el resto no aparece en la nota.
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">Número de sesión</label>
              <input disabled value={`${nextSessionNumber} (autogenerado)`} className="input-lemy opacity-70" />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">Duración (minutos)</label>
              <input name="duracion" type="number" defaultValue={50} className="input-lemy" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">Foco de la sesión</label>
              <input
                name="foco"
                placeholder="Ej. seguimiento a manejo de ansiedad laboral"
                className="input-lemy"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">Observaciones</label>
              <textarea name="observaciones" rows={3} className="input-lemy resize-y" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">Intervenciones</label>
              <textarea name="intervenciones" rows={3} className="input-lemy resize-y" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">Acuerdos</label>
              <textarea name="acuerdos" rows={2} className="input-lemy resize-y" />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">Riesgo</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as typeof riskLevel)}
                className="input-lemy"
              >
                <option value="ninguno">Ninguno</option>
                <option value="a_vigilar">A vigilar</option>
                <option value="riesgo_alto">Riesgo alto</option>
              </select>
            </div>
          </div>

          {riskLevel !== "ninguno" && (
            <div className="mt-4 rounded-[14px] bg-[#FBEAE6] p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">Tipo de riesgo</label>
                  <input name="riesgo_tipo" placeholder="Ej. ideación, autolesión, otro" className="input-lemy" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">
                    Valoración realizada
                  </label>
                  <input name="riesgo_valoracion" className="input-lemy" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">
                    Descripción / observaciones
                  </label>
                  <textarea name="riesgo_descripcion" rows={2} className="input-lemy resize-y" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">Acciones tomadas</label>
                  <input name="riesgo_acciones" className="input-lemy" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">
                    Canalización o referencia
                  </label>
                  <input name="riesgo_canalizacion" placeholder="Si corresponde" className="input-lemy" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">
                    Seguimiento requerido
                  </label>
                  <input name="riesgo_seguimiento" className="input-lemy" />
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-2 font-mono text-[0.78rem] text-[#5A665F]">Enfoque(s) utilizado(s) en esta sesión</p>
            <div className="flex flex-wrap gap-2">
              {ENFOQUE_FAMILIAS.map((familia) => (
                <button
                  key={familia}
                  type="button"
                  onClick={() => toggleFamilia(familia)}
                  className={`rounded-full border px-3.5 py-1.5 text-[0.82rem] ${
                    selectedFamilias.has(familia)
                      ? "border-forest bg-forest text-sage-white"
                      : "border-line bg-card text-[#37433D]"
                  }`}
                >
                  {familia}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-2 font-mono text-[0.78rem] text-[#5A665F]">Campos disponibles para agregar</p>
            <div className="flex flex-wrap gap-2">
              {availableChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  disabled={addedKeys.has(chip.key)}
                  onClick={() => addField(chip.key, chip.nombre)}
                  className={`rounded-full border px-3.5 py-1.5 text-[0.82rem] ${
                    addedKeys.has(chip.key)
                      ? "cursor-default border-transparent bg-forest/10 text-forest opacity-60"
                      : "border-dashed border-rose-deep bg-card text-forest"
                  }`}
                >
                  {addedKeys.has(chip.key) ? `✓ ${chip.nombre}` : `+ ${chip.nombre}`}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowCustomFieldForm((v) => !v)}
              className="mt-3 text-[0.85rem] font-semibold text-forest-deep underline"
            >
              + Agregar campo personalizado
            </button>

            {showCustomFieldForm && (
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <input
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  placeholder="Nombre del campo, ej. Recursos emergentes"
                  className="input-lemy flex-1"
                />
                <label className="flex items-center gap-1.5 whitespace-nowrap text-[0.8rem] text-[#5A665F]">
                  <input
                    type="checkbox"
                    checked={saveCustomFieldChecked}
                    onChange={(e) => setSaveCustomFieldChecked(e.target.checked)}
                  />
                  Guardar para futuras notas
                </label>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="rounded-full border border-forest px-4 py-1.5 text-[0.85rem] font-semibold text-forest"
                >
                  Agregar
                </button>
              </div>
            )}

            <div className="mt-2">
              {dynamicFields.map((f) => (
                <div key={f.nombre} className="relative mt-4 rounded-[10px] border border-line bg-card p-4">
                  <button
                    type="button"
                    onClick={() => removeField(`${f.nombre}`, f.nombre)}
                    aria-label={`Quitar ${f.nombre}`}
                    className="absolute right-3.5 top-3 text-[#8B978F]"
                  >
                    ×
                  </button>
                  <label className="mb-1.5 block text-[0.82rem] font-semibold text-forest">{f.nombre}</label>
                  <textarea
                    rows={2}
                    value={f.valor}
                    onChange={(e) => updateFieldValue(f.nombre, e.target.value)}
                    placeholder="Escribe aquí…"
                    className="input-lemy resize-y"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={(e) => handleSave(false, e.currentTarget.closest("form")!)}
              className="rounded-full border border-forest px-5 py-2.5 text-[0.88rem] font-semibold text-forest disabled:opacity-50"
            >
              Guardar como borrador
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={(e) => handleSave(true, e.currentTarget.closest("form")!)}
              className="rounded-full bg-forest px-5 py-2.5 text-[0.88rem] font-semibold text-sage-white disabled:opacity-50"
            >
              Finalizar nota
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3.5">
        {notes.length === 0 && <p className="text-[0.9rem] text-[#7C877F]">Aún no hay notas de sesión.</p>}
        {notes.map((note) => (
          <div key={note.id} className="rounded-[14px] border border-line bg-sage-white px-5 py-4.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[0.92rem] font-semibold text-forest">Sesión {note.sessionNumber}</span>
              <div className="flex items-center gap-2">
                {note.riskLevel !== "ninguno" && (
                  <span className="rounded-full bg-[#FBEAE6] px-2.5 py-0.5 font-mono text-[0.7rem] text-[#B14A34]">
                    {RISK_LABELS[note.riskLevel]}
                  </span>
                )}
                <span className="text-[0.8rem] text-[#5A665F]">
                  {formatDateEs(note.createdAtIso)} · {note.status === "final" ? "Finalizada" : "Borrador"}
                </span>
              </div>
            </div>

            {note.enfoqueFamilia && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {note.enfoqueFamilia.split(", ").map((f) => (
                  <span key={f} className="rounded-full bg-forest/[0.08] px-2.5 py-0.5 font-mono text-[0.72rem] text-forest">
                    {f}
                  </span>
                ))}
              </div>
            )}

            {note.decryptFailed && (
              <p className="text-[0.88rem] text-[#B14A34]">
                ⚠️ No se pudo descifrar esta nota (¿cambió la llave de cifrado?).
              </p>
            )}

            {note.content && (
              <>
                {note.content.observaciones && (
                  <p className="text-[0.88rem] text-[#37433D]">{note.content.observaciones}</p>
                )}
                {(note.content.camposDinamicos ?? []).map((f) => (
                  <div key={f.nombre} className="mt-2.5 border-t border-line pt-2.5">
                    <label className="mb-0.5 block text-[0.76rem] font-semibold text-rose-deep">{f.nombre}</label>
                    <p className="text-[0.88rem] text-[#37433D]">{f.valor}</p>
                  </div>
                ))}
                {(note.content.addenda ?? []).map((a, i) => (
                  <div key={i} className="mt-3.5 rounded-[8px] border-l-[3px] border-rose bg-card p-3">
                    <p className="mb-1 text-[0.74rem] text-[#7A867F]">
                      Nota complementaria — {formatDateEs(a.fechaIso)} — {a.autor}
                    </p>
                    <p className="text-[0.86rem] text-[#37433D]">{a.texto}</p>
                  </div>
                ))}
              </>
            )}

            {note.status === "final" && (
              <div className="mt-3 border-t border-line pt-3">
                {addendumOpenFor === note.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddendum(note.id, e.currentTarget);
                    }}
                    className="flex flex-col gap-2"
                  >
                    <textarea
                      name="addendum_texto"
                      rows={2}
                      placeholder="Nota complementaria…"
                      className="input-lemy resize-y"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAddendumOpenFor(null)}
                        className="text-[0.8rem] text-[#8B978F]"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-full bg-forest px-4 py-1.5 text-[0.8rem] font-semibold text-sage-white disabled:opacity-50"
                      >
                        Agregar nota complementaria
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddendumOpenFor(note.id)}
                    className="text-[0.8rem] font-medium text-forest hover:underline"
                  >
                    + Nota complementaria
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

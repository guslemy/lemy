"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FIELD_LABELS,
  buildRows,
  guessMapping,
  type FieldKey,
  type ImportRow,
  type Mapping,
} from "@/lib/patient-import/normalize";
import {
  analyzeImport,
  finishImportBatch,
  importChunk,
  queueInvitations,
  startImportBatch,
  type CommitRow,
  type RowAnalysis,
} from "./actions";

type Step = "archivo" | "columnas" | "revision" | "autorizacion" | "importando" | "listo";

type Guardian = { name: string; relationship: string; phone: string; email: string };

type Imported = { patientId: string; rowNumber: number; name: string; email: string | null; isMinor: boolean; createdAt: string | null };

const STEP_LABEL: Record<Step, string> = {
  archivo: "1. Archivo",
  columnas: "2. Columnas",
  revision: "3. Revisión",
  autorizacion: "4. Autorización",
  importando: "5. Importando",
  listo: "6. Listo",
};

const MAPPABLE: FieldKey[] = [
  "fullName",
  "firstName",
  "lastName",
  "email",
  "phone",
  "birthDate",
  "birthDay",
  "birthMonth",
  "birthYear",
  "age",
  "city",
  "createdAt",
];

// CSV sencillo (comas o punto y coma, con comillas).
function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) {
      cur.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cur.push(cell);
      rows.push(cur);
      cur = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || cur.length) {
    cur.push(cell);
    rows.push(cur);
  }
  return rows;
}

async function readFileTable(file: File): Promise<unknown[][]> {
  if (file.name.toLowerCase().endsWith(".csv")) return parseCsv(await file.text());
  const { default: readXlsxFile } = await import("read-excel-file");
  return (await readXlsxFile(file)) as unknown[][];
}

export function ImportarClient() {
  const [step, setStep] = useState<Step>("archivo");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [filename, setFilename] = useState("");
  const [table, setTable] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({});

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [analysis, setAnalysis] = useState<Map<number, RowAnalysis>>(new Map());
  const [selected, setSelected] = useState<Map<number, boolean>>(new Map());
  const [guardians, setGuardians] = useState<Map<number, Guardian>>(new Map());

  const [accepted, setAccepted] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [imported, setImported] = useState<Imported[]>([]);
  const [failures, setFailures] = useState<{ rowNumber: number; error: string }[]>([]);

  const [inviteSel, setInviteSel] = useState<Set<string>>(new Set());
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const headers = (table[0] ?? []) as unknown[];

  // ── Paso 1: archivo ──────────────────────────────────────────────────
  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const t = await readFileTable(file);
      if (t.length < 2) throw new Error("El archivo no tiene filas de pacientes.");
      setFilename(file.name);
      setTable(t);
      setMapping(guessMapping(t[0] as unknown[]));
      setStep("columnas");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pude leer el archivo. Usa un Excel (.xlsx) o un CSV.");
    } finally {
      setBusy(false);
    }
  }

  // ── Paso 2 → 3: revisión ─────────────────────────────────────────────
  async function onAnalyze() {
    setError(null);
    const hasName = mapping.fullName !== undefined || mapping.firstName !== undefined;
    if (!hasName) {
      setError("Indica qué columna trae el nombre.");
      return;
    }
    const built = buildRows(table, mapping);
    if (built.length === 0) {
      setError("No encontré pacientes con esas columnas.");
      return;
    }
    setBusy(true);
    const res = await analyzeImport(built);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setRows(built);
    setAnalysis(new Map(res.rows.map((r) => [r.rowNumber, r])));
    setSelected(new Map(res.rows.map((r) => [r.rowNumber, r.defaultSelected])));
    setGuardians(new Map());
    setStep("revision");
  }

  const stats = useMemo(() => {
    let sel = 0;
    let minors = 0;
    let dups = 0;
    let inLemy = 0;
    let mine = 0;
    let missingGuardian = 0;
    for (const r of rows) {
      const a = analysis.get(r.rowNumber);
      if (!a) continue;
      if (a.groupId && !a.keepInGroup) dups += 1;
      if (a.existsInLemy) inLemy += 1;
      if (a.alreadyYours) mine += 1;
      if (selected.get(r.rowNumber)) {
        sel += 1;
        if (a.isMinor) {
          minors += 1;
          const g = guardians.get(r.rowNumber);
          if (!(g?.name.trim() && (g.phone.trim() || g.email.trim()))) missingGuardian += 1;
        }
      }
    }
    return { sel, minors, dups, inLemy, mine, missingGuardian };
  }, [rows, analysis, selected, guardians]);

  function setGuardian(rowNumber: number, patch: Partial<Guardian>) {
    setGuardians((prev) => {
      const next = new Map(prev);
      next.set(rowNumber, { name: "", relationship: "", phone: "", email: "", ...prev.get(rowNumber), ...patch });
      return next;
    });
  }

  // ── Paso 5: importar por lotes ───────────────────────────────────────
  async function onImport() {
    setError(null);
    const toImport: CommitRow[] = rows
      .filter((r) => selected.get(r.rowNumber))
      .map((r) => {
        const g = guardians.get(r.rowNumber);
        return {
          ...r,
          email: analysis.get(r.rowNumber)?.email ?? null, // ya con el dominio corregido
          guardian: g ? { name: g.name, phone: g.phone || null, email: g.email || null, relationship: g.relationship || null } : null,
        };
      });

    setStep("importando");
    setProgress({ done: 0, total: toImport.length });

    const started = await startImportBatch({ filename, totalRows: toImport.length, accepted });
    if (!started.ok) {
      setError(started.error);
      setStep("autorizacion");
      return;
    }

    const okList: Imported[] = [];
    const failList: { rowNumber: number; error: string }[] = [];
    const CHUNK = 20;
    for (let i = 0; i < toImport.length; i += CHUNK) {
      const slice = toImport.slice(i, i + CHUNK);
      const res = await importChunk(started.batchId, slice);
      if (!res.ok) {
        slice.forEach((r) => failList.push({ rowNumber: r.rowNumber, error: res.error }));
      } else {
        for (const r of res.results) {
          const src = slice.find((s) => s.rowNumber === r.rowNumber);
          if (r.ok && r.patientId && src) {
            okList.push({
              patientId: r.patientId,
              rowNumber: r.rowNumber,
              name: src.fullName,
              email: src.email,
              isMinor: Boolean(analysis.get(r.rowNumber)?.isMinor),
              createdAt: src.sourceCreatedAt,
            });
          } else failList.push({ rowNumber: r.rowNumber, error: r.error ?? "Error" });
        }
      }
      setProgress({ done: Math.min(i + CHUNK, toImport.length), total: toImport.length });
    }

    await finishImportBatch(started.batchId, okList.length, failList.length);
    setImported(okList);
    setFailures(failList);
    setInviteSel(new Set());
    setStep("listo");
  }

  const invitable = imported.filter((p) => p.email && !p.isMinor);

  async function onInvite() {
    setBusy(true);
    const res = await queueInvitations([...inviteSel]);
    setBusy(false);
    setInviteMsg(
      `Listo: ${res.queued} invitación(es) en cola${res.skipped ? ` (${res.skipped} no se pudieron encolar)` : ""}. ` +
        "Se envían de a poco para no saturar el correo; lo que no salga hoy sigue automáticamente mañana."
    );
    setInviteSel(new Set());
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div>
      <ol className="flex flex-wrap gap-2 text-[0.75rem]">
        {(Object.keys(STEP_LABEL) as Step[]).map((s) => (
          <li
            key={s}
            className={`rounded-full border px-3 py-1 ${
              s === step ? "border-forest bg-forest/[0.08] font-semibold text-forest" : "border-line text-[#8B978F]"
            }`}
          >
            {STEP_LABEL[s]}
          </li>
        ))}
      </ol>

      {error && (
        <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-4 py-2.5 text-[0.85rem] text-rose-deep">{error}</p>
      )}

      {step === "archivo" && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <p className="text-[0.95rem] text-[#3E4B44]">
            Sube el Excel (.xlsx) o CSV que te da tu agenda anterior (AgendaPro u otra). Lemy reconoce las columnas solo.
            El archivo se lee en tu navegador; no se sube a ningún lado hasta que tú confirmes.
          </p>
          <input
            type="file"
            accept=".xlsx,.csv"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
            className="mt-4 block w-full cursor-pointer text-[0.9rem]"
          />
          {busy && <p className="mt-3 text-[0.85rem] text-[#7C877F]">Leyendo archivo…</p>}
        </div>
      )}

      {step === "columnas" && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <p className="text-[0.95rem] text-[#3E4B44]">
            Archivo: <strong>{filename}</strong> · {table.length - 1} filas. Revisa que cada dato esté en la columna correcta.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MAPPABLE.map((f) => (
              <label key={f} className="text-[0.82rem] text-[#5A665F]">
                {FIELD_LABELS[f]}
                <select
                  value={mapping[f] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => {
                      const next = { ...m };
                      if (e.target.value === "") delete next[f];
                      else next[f] = Number(e.target.value);
                      return next;
                    })
                  }
                  className="input-lemy mt-1 w-full"
                >
                  <option value="">— no incluir —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {String(h ?? `Columna ${i + 1}`)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep("archivo")}>
              Atrás
            </Button>
            <Button type="button" variant="primary" disabled={busy} onClick={onAnalyze}>
              {busy ? "Revisando…" : "Revisar pacientes"}
            </Button>
          </div>
        </div>
      )}

      {step === "revision" && (
        <div className="mt-6">
          <div className="rounded-2xl border border-line bg-card p-5 text-[0.88rem] text-[#3E4B44]">
            <p>
              <strong>{rows.length}</strong> filas en el archivo · <strong>{stats.sel}</strong> se van a importar.
            </p>
            <ul className="mt-2 space-y-1 text-[0.82rem] text-[#5A665F]">
              <li>{stats.dups} posible(s) duplicado(s): por defecto se importa solo la fila más completa de cada grupo.</li>
              <li>{stats.mine} ya parecen ser pacientes tuyos; {stats.inLemy} ya tienen cuenta en Lemy (no se importan; se conectan cuando agenden contigo).</li>
              <li>{stats.minors} menor(es) de edad: necesitan un adulto responsable o tutor.</li>
            </ul>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full min-w-[720px] text-left text-[0.82rem]">
              <thead>
                <tr className="border-b border-line text-[0.7rem] uppercase tracking-[0.06em] text-[#7C877F]">
                  <th className="px-3 py-2">Importar</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Contacto</th>
                  <th className="px-3 py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const a = analysis.get(r.rowNumber);
                  if (!a) return null;
                  const blocked = a.existsInLemy;
                  const g = guardians.get(r.rowNumber);
                  const isSel = Boolean(selected.get(r.rowNumber));
                  const notes: string[] = [];
                  if (a.groupId) notes.push(`Duplicado (${a.groupReasons.join(", ")})${a.keepInGroup ? " · fila principal" : ""}`);
                  if (a.alreadyYours) notes.push("Ya es paciente tuyo");
                  if (a.existsInLemy) notes.push("Ya tiene cuenta en Lemy");
                  if (a.emailInvalid) notes.push("Correo no válido (se importa sin correo)");
                  if (a.emailCorrected) notes.push("Correo corregido");
                  if (a.sharesPhoneWith) notes.push(`Comparte teléfono con ${a.sharesPhoneWith}`);
                  if (a.isMinor) notes.push("Menor de edad");
                  return (
                    <tr key={r.rowNumber} className={`border-b border-line/60 align-top ${isSel ? "" : "opacity-60"}`}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          disabled={blocked}
                          checked={isSel}
                          onChange={(e) => setSelected((m) => new Map(m).set(r.rowNumber, e.target.checked))}
                          className="h-4 w-4 cursor-pointer accent-forest"
                        />
                      </td>
                      <td className="px-3 py-2 text-forest">
                        {r.fullName || <em>(sin nombre)</em>}
                        <span className="block text-[0.72rem] text-[#8B978F]">Fila {r.rowNumber}</span>
                      </td>
                      <td className="px-3 py-2 text-[#3E4B44]">
                        {a.email ?? "—"}
                        <span className="block text-[0.75rem] text-[#8B978F]">{r.phone ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 text-[0.78rem] text-[#5A665F]">
                        {notes.join(" · ") || "—"}
                        {a.isMinor && isSel && (
                          <div className="mt-2 grid grid-cols-1 gap-1.5 rounded-xl border border-rose-deep/30 bg-rose/10 p-2.5 sm:grid-cols-2">
                            <input
                              placeholder="Adulto responsable o tutor *"
                              value={g?.name ?? ""}
                              onChange={(e) => setGuardian(r.rowNumber, { name: e.target.value })}
                              className="input-lemy"
                            />
                            <input
                              placeholder="Parentesco (mamá, papá, tutor…)"
                              value={g?.relationship ?? ""}
                              onChange={(e) => setGuardian(r.rowNumber, { relationship: e.target.value })}
                              className="input-lemy"
                            />
                            <input
                              placeholder="Teléfono del adulto"
                              value={g?.phone ?? ""}
                              onChange={(e) => setGuardian(r.rowNumber, { phone: e.target.value })}
                              className="input-lemy"
                            />
                            <input
                              placeholder="Correo del adulto"
                              value={g?.email ?? ""}
                              onChange={(e) => setGuardian(r.rowNumber, { email: e.target.value })}
                              className="input-lemy"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {stats.missingGuardian > 0 && (
            <p className="mt-3 text-[0.85rem] text-rose-deep">
              Faltan los datos del adulto responsable en {stats.missingGuardian} menor(es) (nombre y teléfono o correo). Complétalos
              o desmarca esas filas para continuar.
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep("columnas")}>
              Atrás
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={stats.sel === 0 || stats.missingGuardian > 0}
              onClick={() => setStep("autorizacion")}
            >
              Continuar con {stats.sel} paciente(s)
            </Button>
          </div>
        </div>
      )}

      {step === "autorizacion" && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <h2 className="font-display text-[1.2rem] text-forest">Antes de importar</h2>
          <p className="mt-3 text-[0.9rem] text-[#3E4B44]">
            Vas a cargar datos personales de {stats.sel} pacientes. Cada uno quedará como un registro en tu lista, sin acceso a Lemy
            y <strong>sin recibir ningún aviso</strong> hasta que active su cuenta. Solo puedes invitar a quien tú elijas.
          </p>
          <label className="mt-4 flex items-start gap-2.5 text-[0.88rem] text-[#3E4B44]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-forest"
            />
            <span>
              Confirmo que tengo derecho a tratar estos datos personales de mis pacientes y que ellos fueron informados de su
              tratamiento (aviso de privacidad). Entiendo que Lemy los resguarda por mi cuenta, y que los datos de menores de edad
              requieren el consentimiento de su madre, padre o tutor.
            </span>
          </label>
          <div className="mt-5 flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep("revision")}>
              Atrás
            </Button>
            <Button type="button" variant="primary" disabled={!accepted} onClick={onImport}>
              Importar {stats.sel} paciente(s)
            </Button>
          </div>
        </div>
      )}

      {step === "importando" && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <p className="text-[0.95rem] text-[#3E4B44]">
            Importando… {progress.done} de {progress.total}. No cierres esta página.
          </p>
          <div className="mt-3 h-2 w-full rounded-full bg-line">
            <div
              className="h-2 rounded-full bg-forest transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {step === "listo" && (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="font-display text-[1.2rem] text-forest">Listo: {imported.length} paciente(s) importados</h2>
            {failures.length > 0 && (
              <div className="mt-3 rounded-xl border border-rose-deep/30 bg-rose/10 p-3 text-[0.82rem] text-rose-deep">
                <p>{failures.length} fila(s) no se pudieron importar:</p>
                <ul className="mt-1 list-disc pl-5">
                  {failures.slice(0, 20).map((f) => (
                    <li key={f.rowNumber}>
                      Fila {f.rowNumber}: {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link href="/dashboard/pacientes" className="mt-4 inline-block text-[0.9rem] font-semibold text-rose-deep underline">
              Ver mi lista de pacientes →
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="font-display text-[1.2rem] text-forest">Invitar a tus pacientes activos</h2>
            <p className="mt-2 text-[0.88rem] text-[#3E4B44]">
              Elige solo a quienes quieras invitar a crear su cuenta en Lemy (por correo). No se invita a menores ni a quien no tiene
              correo. Las invitaciones salen de a poco; lo pendiente sigue solo al día siguiente.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[0.8rem]">
              <button type="button" className="cursor-pointer underline" onClick={() => setInviteSel(new Set(invitable.map((p) => p.patientId)))}>
                Todos
              </button>
              <button type="button" className="cursor-pointer underline" onClick={() => setInviteSel(new Set())}>
                Ninguno
              </button>
              <button
                type="button"
                className="cursor-pointer underline"
                onClick={() => {
                  const cutoff = new Date();
                  cutoff.setFullYear(cutoff.getFullYear() - 1);
                  const iso = cutoff.toISOString().slice(0, 10);
                  setInviteSel(new Set(invitable.filter((p) => p.createdAt && p.createdAt >= iso).map((p) => p.patientId)));
                }}
              >
                Dados de alta en el último año
              </button>
            </div>
            <ul className="mt-3 max-h-[320px] overflow-y-auto rounded-xl border border-line">
              {invitable.map((p) => (
                <li key={p.patientId} className="flex items-center gap-3 border-b border-line/60 px-3 py-2 text-[0.85rem] last:border-0">
                  <input
                    type="checkbox"
                    checked={inviteSel.has(p.patientId)}
                    onChange={(e) =>
                      setInviteSel((s) => {
                        const next = new Set(s);
                        if (e.target.checked) next.add(p.patientId);
                        else next.delete(p.patientId);
                        return next;
                      })
                    }
                    className="h-4 w-4 cursor-pointer accent-forest"
                  />
                  <span className="text-forest">{p.name}</span>
                  <span className="text-[#8B978F]">{p.email}</span>
                </li>
              ))}
              {invitable.length === 0 && <li className="px-3 py-3 text-[0.85rem] text-[#7C877F]">Ninguno de los importados se puede invitar por correo.</li>}
            </ul>
            {inviteMsg && <p className="mt-3 rounded-xl bg-forest/[0.06] px-3 py-2 text-[0.85rem] text-forest">{inviteMsg}</p>}
            <Button type="button" variant="primary" className="mt-4" disabled={busy || inviteSel.size === 0} onClick={onInvite}>
              Enviar invitación a {inviteSel.size} paciente(s)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

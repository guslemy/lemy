"use client";

import { useState } from "react";
import {
  saveClinicalProfile,
  saveClinicalHistory,
  createEvaluation,
  markCashConfirmed,
  uploadPatientDocument,
  deletePatientDocument,
} from "@/app/dashboard/pacientes/ficha-actions";
import { SessionNotesTab } from "./session-notes-builder";
import { LinkPreviousPatient } from "./link-previous-patient";
import type {
  ClinicalProfile,
  EvaluationRow,
  HistoryLinkSummary,
  PatientDocumentRow,
  SessionNoteRow,
} from "@/lib/clinical-record";
import type { ClinicalHistoryContent } from "@/lib/clinical-record-crypto";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "datos", label: "Datos generales" },
  { id: "historia", label: "Historia clínica" },
  { id: "notas", label: "Notas de sesión" },
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "citas", label: "Citas" },
  { id: "documentos", label: "Documentos y pagos" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const REFERRAL_OPTIONS = [
  "Directorio de Lemy (búsqueda o test de afinidad)",
  "Redes sociales o link del propio terapeuta",
  "Recomendación de un(a) amigo(a) o familiar",
  "Recomendación de otro profesional de salud",
  "Ya conocía al terapeuta antes de estar en Lemy",
  "Otro",
];

function formatDateEs(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[0.78rem] text-[#5A665F]">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="input-lemy"
      />
    </div>
  );
}

function HistoryField({
  label,
  name,
  hint,
  defaultValue,
}: {
  label: string;
  name: string;
  hint?: string;
  defaultValue?: string;
}) {
  return (
    <div className="mb-4.5">
      <label className="mb-1 block text-[0.9rem] font-semibold text-forest">{label}</label>
      {hint && <p className="mb-2 text-[0.8rem] text-[#7A867F]">{hint}</p>}
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={3} className="input-lemy resize-y" />
    </div>
  );
}

export function PatientFichaTabs({
  patientId,
  therapistDisplayName,
  profile,
  history,
  sessionNotes,
  customFields,
  evaluations,
  appointmentsForCitas,
  documents,
  cashPendingCount,
  defaultEnfoqueFamilia,
  historyLink,
}: {
  patientId: string;
  therapistDisplayName: string;
  profile: ClinicalProfile | null;
  history: ClinicalHistoryContent;
  sessionNotes: SessionNoteRow[];
  customFields: { id: string; nombre: string }[];
  evaluations: EvaluationRow[];
  appointmentsForCitas: {
    id: string;
    scheduledAtIso: string;
    status: string;
    modality: string;
    paymentStatus: string;
    cashConfirmedAt: string | null;
    price: number;
  }[];
  documents: PatientDocumentRow[];
  cashPendingCount: number;
  defaultEnfoqueFamilia: string | null;
  historyLink: HistoryLinkSummary | null;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("resumen");

  const finalizedNotes = sessionNotes.filter((n) => n.status === "final");
  const lastNotes = finalizedNotes.slice(0, 2);
  const pastAppointments = appointmentsForCitas.filter(
    (a) => new Date(a.scheduledAtIso).getTime() < Date.now()
  );
  const upcomingAppointment = appointmentsForCitas
    .filter((a) => new Date(a.scheduledAtIso).getTime() >= Date.now() && a.status !== "cancelled")
    .sort((a, b) => new Date(a.scheduledAtIso).getTime() - new Date(b.scheduledAtIso).getTime())[0];
  const firstAppointment = [...appointmentsForCitas].sort(
    (a, b) => new Date(a.scheduledAtIso).getTime() - new Date(b.scheduledAtIso).getTime()
  )[0];
  const lastEnfoque = finalizedNotes[0]?.enfoqueFamilia ?? "—";

  return (
    <div className="main-card overflow-hidden rounded-[22px] border border-line bg-card">
      {cashPendingCount > 0 && (
        <div className="bg-[#FBEAE6] px-6 py-3 text-center text-[0.86rem] font-semibold text-[#B14A34]">
          CLIENTE CON PAGO PENDIENTE — {cashPendingCount} consulta{cashPendingCount > 1 ? "s" : ""} en efectivo sin
          confirmar
        </div>
      )}

      <div className="flex items-center justify-between border-b border-line pr-5">
      <div className="flex overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-5 py-4 text-[0.9rem] font-medium ${
              activeTab === tab.id
                ? "border-rose-deep font-semibold text-forest"
                : "border-transparent text-[#5A665F] hover:text-forest"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
        <a
          href={`/api/pacientes/${patientId}/expediente-pdf`}
          className="whitespace-nowrap text-[0.82rem] font-semibold text-forest hover:underline"
        >
          Exportar expediente (PDF)
        </a>
      </div>

      <div className="p-7">
        {activeTab === "resumen" && (
          <div>
            <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-[14px] border border-line bg-sage-white p-4">
                <span className="mb-1.5 block font-mono text-[0.72rem] text-rose-deep">Inicio del proceso</span>
                <strong className="font-display text-[1.05rem] text-forest">
                  {formatDateEs(firstAppointment?.scheduledAtIso ?? null)}
                </strong>
              </div>
              <div className="rounded-[14px] border border-line bg-sage-white p-4">
                <span className="mb-1.5 block font-mono text-[0.72rem] text-rose-deep">Sesiones realizadas</span>
                <strong className="font-display text-[1.05rem] text-forest">{finalizedNotes.length}</strong>
              </div>
              <div className="rounded-[14px] border border-line bg-sage-white p-4">
                <span className="mb-1.5 block font-mono text-[0.72rem] text-rose-deep">Modalidad</span>
                <strong className="font-display text-[1.05rem] text-forest">
                  {upcomingAppointment?.modality === "presencial" ? "Presencial" : "Online"}
                </strong>
              </div>
              <div className="rounded-[14px] border border-line bg-sage-white p-4">
                <span className="mb-1.5 block font-mono text-[0.72rem] text-rose-deep">Enfoque</span>
                <strong className="font-display text-[1.05rem] text-forest">{lastEnfoque}</strong>
              </div>
            </div>

            <h3 className="mb-4 font-display text-[1rem] text-forest">Últimas notas de sesión</h3>
            {lastNotes.length === 0 && <p className="text-[0.88rem] text-[#7C877F]">Aún no hay notas.</p>}
            {lastNotes.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-b-0">
                <span className="min-w-[70px] text-[0.78rem] text-[#5A665F]">{formatDateEs(n.createdAtIso)}</span>
                <p className="mx-4 flex-1 truncate text-[0.88rem] text-[#37433D]">
                  {n.content?.observaciones || n.content?.foco || "Sesión " + n.sessionNumber}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("notas")}
                  className="whitespace-nowrap text-[0.82rem] font-semibold text-forest"
                >
                  Ver nota →
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "datos" && (
          <div>
            <LinkPreviousPatient patientId={patientId} existingLink={historyLink} />
            <form action={saveClinicalProfile}>
            <input type="hidden" name="patient_id" value={patientId} />
            <h3 className="mb-4 font-display text-[1rem] text-forest">Información de contacto</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Nombre completo" name="full_name" defaultValue={profile?.fullName} />
              <Field label="Fecha de nacimiento" name="birth_date" type="date" defaultValue={profile?.birthDate} />
              <Field label="Teléfono" name="phone" defaultValue={profile?.phone} />
              <Field label="Correo electrónico" name="email" defaultValue={profile?.email} />
              <Field label="Ocupación" name="occupation" defaultValue={profile?.occupation} />
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[0.78rem] text-[#5A665F]">¿Cómo llegó a la consulta?</label>
                <select name="referral_source" defaultValue={profile?.referralSource ?? ""} className="input-lemy">
                  <option value="">Sin especificar</option>
                  {REFERRAL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Dirección (opcional)"
                  name="address"
                  defaultValue={profile?.address}
                  placeholder="Solo si es relevante para el proceso"
                />
              </div>
            </div>

            <div className="mt-7 border-t border-line pt-6">
              <h3 className="mb-4 font-display text-[1rem] text-forest">Contacto de emergencia</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Nombre" name="emergency_contact_name" defaultValue={profile?.emergencyContactName} />
                <Field
                  label="Relación"
                  name="emergency_contact_relationship"
                  defaultValue={profile?.emergencyContactRelationship}
                />
                <Field
                  label="Teléfono"
                  name="emergency_contact_phone"
                  defaultValue={profile?.emergencyContactPhone}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-forest px-5 py-2.5 text-[0.88rem] font-semibold text-sage-white hover:bg-forest-deep"
              >
                Guardar cambios
              </button>
            </div>
            </form>
          </div>
        )}

        {activeTab === "historia" && (
          <form action={saveClinicalHistory}>
            <input type="hidden" name="patient_id" value={patientId} />
            <p className="mb-6 text-[0.82rem] text-[#8B978F]">
              Se captura generalmente en la primera entrevista y se actualiza ocasionalmente — no es un registro
              por sesión. Cada apartado es un campo amplio de texto libre; tú decides qué es pertinente
              documentar en cada uno.
            </p>

            <div className="mb-8">
              <h4 className="mb-3.5 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-rose-deep">
                Motivo y contexto
              </h4>
              <HistoryField
                label="Motivo de consulta (detallado)"
                name="motivoDetallado"
                defaultValue={history.motivoDetallado}
              />
              <HistoryField
                label="Antecedentes personales relevantes"
                name="antecedentesPersonales"
                defaultValue={history.antecedentesPersonales}
              />
              <HistoryField
                label="Antecedentes familiares relevantes"
                name="antecedentesFamiliares"
                defaultValue={history.antecedentesFamiliares}
              />
            </div>

            <div className="mb-8">
              <h4 className="mb-3.5 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-rose-deep">
                Historia clínica y de salud
              </h4>
              <HistoryField
                label="Antecedentes psicológicos y/o psiquiátricos"
                name="antecedentesPsicologicosPsiquiatricos"
                defaultValue={history.antecedentesPsicologicosPsiquiatricos}
              />
              <HistoryField
                label="Antecedentes médicos relevantes"
                name="antecedentesMedicos"
                defaultValue={history.antecedentesMedicos}
              />
              <HistoryField
                label="Tratamientos previos o actuales"
                name="tratamientosPreviosActuales"
                defaultValue={history.tratamientosPreviosActuales}
              />
              <HistoryField
                label="Tratamiento psiquiátrico actual"
                name="tratamientoPsiquiatricoActual"
                defaultValue={history.tratamientoPsiquiatricoActual}
              />
              <HistoryField label="Medicación actual" name="medicacionActual" defaultValue={history.medicacionActual} />
            </div>

            <div className="mb-8">
              <h4 className="mb-3.5 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-rose-deep">
                Desarrollo y trayectoria
              </h4>
              <HistoryField
                label="Antecedentes del desarrollo"
                name="antecedentesDelDesarrollo"
                defaultValue={history.antecedentesDelDesarrollo}
              />
              <HistoryField
                label="Historia escolar y/o laboral"
                name="historiaEscolarLaboral"
                defaultValue={history.historiaEscolarLaboral}
              />
            </div>

            <div className="mb-8">
              <h4 className="mb-3.5 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-rose-deep">
                Contexto relacional y de vida
              </h4>
              <HistoryField
                label="Relaciones interpersonales y red de apoyo"
                name="relacionesInterpersonales"
                defaultValue={history.relacionesInterpersonales}
              />
              <HistoryField
                label="Acontecimientos vitales significativos"
                name="acontecimientosVitalesSignificativos"
                defaultValue={history.acontecimientosVitalesSignificativos}
              />
              <HistoryField
                label="Hábitos y estilo de vida relevantes"
                name="habitosEstiloDeVida"
                defaultValue={history.habitosEstiloDeVida}
              />
            </div>

            <div className="mb-8">
              <h4 className="mb-3.5 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-rose-deep">
                Valoración clínica
              </h4>
              <HistoryField
                label="Evaluaciones o diagnósticos previos reportados"
                name="evaluacionesDiagnosticosPrevios"
                defaultValue={history.evaluacionesDiagnosticosPrevios}
              />
              <HistoryField
                label="Observaciones / impresión clínica inicial"
                name="observacionesImpresionClinica"
                defaultValue={history.observacionesImpresionClinica}
              />
              <HistoryField
                label="Factores de riesgo y factores protectores"
                name="factoresDeRiesgoProtectores"
                defaultValue={history.factoresDeRiesgoProtectores}
              />
            </div>

            <div className="mb-2">
              <h4 className="mb-3.5 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-rose-deep">
                Plan de trabajo
              </h4>
              <HistoryField
                label="Objetivos terapéuticos acordados"
                name="objetivosTerapeuticos"
                defaultValue={history.objetivosTerapeuticos}
              />
              <HistoryField
                label="Plan terapéutico / consideraciones iniciales"
                name="planTerapeutico"
                defaultValue={history.planTerapeutico}
              />
              <HistoryField
                label="Información adicional relevante"
                name="informacionAdicional"
                defaultValue={history.informacionAdicional}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-forest px-5 py-2.5 text-[0.88rem] font-semibold text-sage-white hover:bg-forest-deep"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        )}

        {activeTab === "notas" && (
          <SessionNotesTab
            patientId={patientId}
            nextSessionNumber={sessionNotes.length + 1}
            defaultEnfoqueFamilia={defaultEnfoqueFamilia}
            customFields={customFields}
            notes={sessionNotes}
            therapistDisplayName={therapistDisplayName}
          />
        )}

        {activeTab === "evaluaciones" && (
          <div>
            <p className="mb-5 text-[0.82rem] text-[#8B978F]">
              Registro de instrumentos o evaluaciones aplicadas durante el proceso — independiente de las notas
              de sesión.
            </p>
            <EvaluationForm patientId={patientId} />
            <div className="mt-6 flex flex-col gap-3.5">
              {evaluations.map((ev) => (
                <div key={ev.id} className="rounded-[14px] border border-line bg-sage-white px-5 py-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[0.92rem] font-semibold text-forest">{ev.instrumento}</span>
                    <span className="text-[0.8rem] text-[#5A665F]">{formatDateEs(ev.fechaIso)}</span>
                  </div>
                  {ev.content?.puntaje && (
                    <span className="inline-block rounded-full bg-[rgba(185,148,51,0.14)] px-2.5 py-0.5 font-mono text-[0.78rem] text-[#8E7124]">
                      Puntaje: {ev.content.puntaje}
                    </span>
                  )}
                  {ev.content?.interpretacion && (
                    <div className="mt-2.5 border-t border-line pt-2.5">
                      <label className="mb-0.5 block text-[0.76rem] font-semibold text-rose-deep">
                        Interpretación breve
                      </label>
                      <p className="text-[0.88rem] text-[#37433D]">{ev.content.interpretacion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "citas" && (
          <div>
            {upcomingAppointment && (
              <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-forest px-6 py-5 text-sage-white">
                <div>
                  <span className="mb-1 block font-mono text-[0.74rem] text-rose">Próxima cita</span>
                  <strong className="font-display text-[1.1rem]">
                    {new Date(upcomingAppointment.scheduledAtIso).toLocaleString("es-MX", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </div>
              </div>
            )}

            <h3 className="mb-3.5 font-display text-[1rem] text-forest">Historial de citas</h3>
            <table className="w-full border-collapse text-[0.88rem]">
              <thead>
                <tr>
                  <th className="border-b border-line py-2.5 text-left font-mono text-[0.72rem] text-[#5A665F]">
                    Fecha
                  </th>
                  <th className="border-b border-line py-2.5 text-left font-mono text-[0.72rem] text-[#5A665F]">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointmentsForCitas.map((a) => (
                  <tr key={a.id}>
                    <td className="border-b border-line py-3 text-[#37433D]">{formatDateEs(a.scheduledAtIso)}</td>
                    <td className="border-b border-line py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[0.78rem] font-semibold ${
                          a.status === "cancelled"
                            ? "bg-[#FBEAE6] text-[#B14A34]"
                            : "bg-forest/[0.09] text-forest"
                        }`}
                      >
                        {a.status === "cancelled"
                          ? "Canceló"
                          : a.status === "completed" || a.status === "confirmed"
                            ? "Asistió"
                            : a.status === "no_show"
                              ? "No asistió"
                              : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "documentos" && (
          <DocumentosTab patientId={patientId} documents={documents} appointments={appointmentsForCitas} />
        )}
      </div>
    </div>
  );
}

function EvaluationForm({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-forest px-5 py-2.5 text-[0.88rem] font-semibold text-sage-white hover:bg-forest-deep"
      >
        + Agregar evaluación
      </button>
    );
  }
  return (
    <form
      action={createEvaluation}
      onSubmit={() => setOpen(false)}
      className="rounded-[14px] border border-line bg-sage-white p-5"
    >
      <input type="hidden" name="patient_id" value={patientId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Instrumento" name="instrumento" placeholder="Ej. Inventario de Ansiedad de Beck (BAI)" />
        <Field label="Fecha" name="fecha" type="date" />
        <Field label="Puntaje / resultado" name="puntaje" placeholder="Ej. 24 — ansiedad moderada" />
        <div className="sm:col-span-2">
          <label className="mb-1.5 block font-mono text-[0.78rem] text-[#5A665F]">Interpretación breve</label>
          <textarea name="interpretacion" rows={2} className="input-lemy resize-y" />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <button type="button" onClick={() => setOpen(false)} className="text-[0.85rem] text-[#8B978F]">
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-full bg-forest px-5 py-2 text-[0.86rem] font-semibold text-sage-white"
        >
          Guardar evaluación
        </button>
      </div>
    </form>
  );
}

const MAX_DOCUMENT_MB = 20;

function DocumentosTab({
  patientId,
  documents,
  appointments,
}: {
  patientId: string;
  documents: PatientDocumentRow[];
  appointments: {
    id: string;
    scheduledAtIso: string;
    paymentStatus: string;
    cashConfirmedAt: string | null;
    price: number;
  }[];
}) {
  const [oversizeError, setOversizeError] = useState(false);
  const consentimientos = documents.filter((d) => d.category === "consentimiento");
  const compartidos = documents.filter((d) => d.category === "compartido");
  const cashAppointments = appointments.filter((a) => a.paymentStatus === "efectivo");

  return (
    <div>
      <h3 className="mb-3.5 font-display text-[1rem] text-forest">Consentimientos informados</h3>
      <p className="mb-3 text-[0.8rem] text-[#8B978F]">
        Solo tú los ves — respaldo del documento ya firmado, sin firma electrónica.
      </p>
      {consentimientos.map((d) => (
        <DocRow key={d.id} doc={d} patientId={patientId} />
      ))}
      <UploadForm patientId={patientId} category="consentimiento" onOversize={() => setOversizeError(true)} />

      <div className="mt-8 border-t border-line pt-6">
        <h3 className="mb-3.5 font-display text-[1rem] text-forest">Documentos compartidos</h3>
        <p className="mb-3 text-[0.8rem] text-[#8B978F]">Visibles para ti y para tu paciente. Cualquiera puede subir.</p>
        {compartidos.map((d) => (
          <DocRow key={d.id} doc={d} patientId={patientId} />
        ))}
        <UploadForm patientId={patientId} category="compartido" onOversize={() => setOversizeError(true)} />
        {oversizeError && (
          <p className="mt-2 text-[0.82rem] text-[#B14A34]">
            Este objeto es muy grande. Te sugerimos subir tu archivo a Google Drive y escribir aquí el link para
            que tu terapeuta/paciente pueda verlo.{" "}
            <a href="#" className="underline">
              Da click aquí para aprender cómo hacerlo
            </a>
            .
          </p>
        )}
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <h3 className="mb-3.5 font-display text-[1rem] text-forest">Historial de pagos</h3>
        <table className="w-full border-collapse text-[0.88rem]">
          <thead>
            <tr>
              <th className="border-b border-line py-2.5 text-left font-mono text-[0.72rem] text-[#5A665F]">Fecha</th>
              <th className="border-b border-line py-2.5 text-left font-mono text-[0.72rem] text-[#5A665F]">Monto</th>
              <th className="border-b border-line py-2.5 text-left font-mono text-[0.72rem] text-[#5A665F]">Estado</th>
              <th className="border-b border-line py-2.5" />
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => {
              const paid = a.paymentStatus === "paid" || Boolean(a.cashConfirmedAt);
              return (
                <tr key={a.id}>
                  <td className="border-b border-line py-3 text-[#37433D]">{formatDateEs(a.scheduledAtIso)}</td>
                  <td className="border-b border-line py-3 text-[#37433D]">${a.price} MXN</td>
                  <td className="border-b border-line py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[0.78rem] font-semibold ${
                        paid ? "bg-forest/[0.09] text-forest" : "bg-[#FBEAE6] text-[#B14A34]"
                      }`}
                    >
                      {paid ? "Pagado" : "Pendiente"}
                    </span>
                  </td>
                  <td className="border-b border-line py-3">
                    {!paid && a.paymentStatus === "efectivo" && (
                      <form action={markCashConfirmed}>
                        <input type="hidden" name="appointment_id" value={a.id} />
                        <input type="hidden" name="patient_id" value={patientId} />
                        <button type="submit" className="text-[0.8rem] font-semibold text-forest hover:underline">
                          Consulta pagada
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {cashAppointments.length === 0 && appointments.length === 0 && (
          <p className="mt-3 text-[0.85rem] text-[#7C877F]">Aún no hay citas registradas.</p>
        )}
      </div>
    </div>
  );
}

function DocRow({ doc, patientId }: { doc: PatientDocumentRow; patientId: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3.5 last:border-b-0">
      <div className="flex items-center gap-3 text-[0.9rem] text-[#37433D]">
        <span className="flex h-8.5 w-8.5 items-center justify-center rounded-[8px] bg-forest/[0.08] text-forest">
          {doc.filePath ? "📎" : "🔗"}
        </span>
        <div>
          <p>{doc.fileName ?? doc.note ?? "Documento"}</p>
          {doc.fileName && doc.note && <p className="text-[0.78rem] text-[#8B978F]">{doc.note}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[0.76rem] text-[#8B978F]">
          {doc.uploadedByRole === "patient" ? "Subido por paciente" : "Subido por ti"}
        </span>
        <form action={deletePatientDocument}>
          <input type="hidden" name="document_id" value={doc.id} />
          <input type="hidden" name="patient_id" value={patientId} />
          <button type="submit" className="text-[0.78rem] text-[#8B978F] hover:text-rose-deep">
            Eliminar
          </button>
        </form>
      </div>
    </div>
  );
}

function UploadForm({
  patientId,
  category,
  onOversize,
}: {
  patientId: string;
  category: "compartido" | "consentimiento";
  onOversize: () => void;
}) {
  return (
    <form
      action={uploadPatientDocument}
      onSubmit={(e) => {
        const input = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
        const file = input?.files?.[0];
        if (file && file.size > MAX_DOCUMENT_MB * 1024 * 1024) {
          e.preventDefault();
          onOversize();
        }
      }}
      className="mt-3 flex flex-wrap items-center gap-2.5"
    >
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="category" value={category} />
      <input type="file" name="file" className="text-[0.82rem]" />
      <input
        type="text"
        name="note"
        placeholder="Comentario o link (opcional)"
        className="input-lemy flex-1 min-w-[180px]"
      />
      <button type="submit" className="rounded-full border border-forest px-4 py-1.5 text-[0.85rem] font-semibold text-forest">
        Subir
      </button>
    </form>
  );
}

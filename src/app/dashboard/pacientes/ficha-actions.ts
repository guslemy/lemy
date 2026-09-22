"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hasGestionaPlan } from "@/lib/plan-features";
import { encryptClinicalRecord, decryptClinicalRecord } from "@/lib/clinical-record-crypto";
import type {
  ClinicalHistoryContent,
  SessionNoteContent,
  SessionNoteAddendum,
  EvaluationContent,
} from "@/lib/clinical-record-crypto";

// Mismo patrón que clinical-notes-actions.ts: valida sesión + rol. La ficha
// completa (esta familia de acciones) es exclusiva del plan Gestiona — ver
// lib/plan-features.ts — así que además valida el plan antes de dejar
// escribir nada. Un terapeuta de Empieza que de algún modo llegue a llamar
// una de estas acciones (URL a mano, etc.) simplemente no logra nada: la
// fila no se toca.
async function requireGestionaTherapist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: therapist } = await supabase
    .from("therapists")
    .select("subscription_plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!therapist || !hasGestionaPlan(therapist.subscription_plan, therapist.subscription_status)) {
    redirect("/dashboard?tab=suscripcion&ficha_error_plan=1");
  }

  return { supabase, user };
}

// Nadie puede escribir sobre un paciente que nunca ha visto solo adivinando
// su id — mismo chequeo que ya usaba clinical-notes-actions.ts.
async function verifyRelationship(
  supabase: Awaited<ReturnType<typeof createClient>>,
  therapistId: string,
  patientId: string
) {
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", therapistId)
    .eq("patient_id", patientId);
  return Boolean(count);
}

function fichaPath(patientId: string) {
  return `/dashboard/pacientes/${patientId}`;
}

// ─────────────────────────────────────────────
// Datos generales — sin cifrar, upsert directo (el terapeuta puede corregir
// cualquier campo en cualquier momento, no hay historial de cambios).
// ─────────────────────────────────────────────
export async function saveClinicalProfile(formData: FormData) {
  const { supabase, user } = await requireGestionaTherapist();
  const patientId = String(formData.get("patient_id") || "");
  if (!patientId || !(await verifyRelationship(supabase, user.id, patientId))) return;

  const field = (name: string) => {
    const v = String(formData.get(name) || "").trim();
    return v || null;
  };

  await supabase.from("patient_clinical_profile").upsert({
    therapist_id: user.id,
    patient_id: patientId,
    full_name: field("full_name"),
    birth_date: field("birth_date"),
    phone: field("phone"),
    email: field("email"),
    occupation: field("occupation"),
    referral_source: field("referral_source"),
    address: field("address"),
    emergency_contact_name: field("emergency_contact_name"),
    emergency_contact_relationship: field("emergency_contact_relationship"),
    emergency_contact_phone: field("emergency_contact_phone"),
    updated_at: new Date().toISOString(),
  });

  revalidatePath(fichaPath(patientId));
}

// ─────────────────────────────────────────────
// Historia clínica — cifrada, upsert (documento vivo, sí se edita en el
// tiempo a diferencia de las notas de sesión).
// ─────────────────────────────────────────────
const HISTORY_FIELDS: (keyof ClinicalHistoryContent)[] = [
  "motivoDetallado",
  "antecedentesPersonales",
  "antecedentesFamiliares",
  "antecedentesPsicologicosPsiquiatricos",
  "antecedentesMedicos",
  "tratamientosPreviosActuales",
  "tratamientoPsiquiatricoActual",
  "medicacionActual",
  "antecedentesDelDesarrollo",
  "historiaEscolarLaboral",
  "relacionesInterpersonales",
  "acontecimientosVitalesSignificativos",
  "habitosEstiloDeVida",
  "evaluacionesDiagnosticosPrevios",
  "observacionesImpresionClinica",
  "factoresDeRiesgoProtectores",
  "objetivosTerapeuticos",
  "planTerapeutico",
  "informacionAdicional",
];

export async function saveClinicalHistory(formData: FormData) {
  const { supabase, user } = await requireGestionaTherapist();
  const patientId = String(formData.get("patient_id") || "");
  if (!patientId || !(await verifyRelationship(supabase, user.id, patientId))) return;

  const content: ClinicalHistoryContent = {};
  for (const key of HISTORY_FIELDS) {
    const value = String(formData.get(key) || "").trim();
    if (value) content[key] = value;
  }

  const { ciphertext, iv, authTag } = encryptClinicalRecord(content);

  await supabase.from("patient_clinical_history").upsert({
    therapist_id: user.id,
    patient_id: patientId,
    ciphertext,
    iv,
    auth_tag: authTag,
    updated_at: new Date().toISOString(),
  });

  revalidatePath(fichaPath(patientId));
}

// ─────────────────────────────────────────────
// Notas de sesión — inmutables tras finalizar. Igual que clinical_notes
// (0035), session_notes NO tiene política de UPDATE para el terapeuta, así
// que guardar un borrador, finalizarlo o agregar un addendum pasa siempre
// por aquí con el service client, validando dueño y estado a mano.
// ─────────────────────────────────────────────

async function nextSessionNumber(
  serviceClient: ReturnType<typeof createServiceClient>,
  therapistId: string,
  patientId: string
) {
  const { count } = await serviceClient
    .from("session_notes")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", therapistId)
    .eq("patient_id", patientId)
    .is("deleted_at", null);
  return (count ?? 0) + 1;
}

export async function saveSessionNote(params: {
  patientId: string;
  appointmentId?: string | null;
  finalize: boolean;
  riskLevel: "ninguno" | "a_vigilar" | "riesgo_alto";
  enfoqueFamilia?: string | null;
  content: SessionNoteContent;
  existingDraftId?: string | null;
}) {
  const { supabase, user } = await requireGestionaTherapist();
  if (!params.patientId || !(await verifyRelationship(supabase, user.id, params.patientId))) return;

  const serviceClient = createServiceClient();
  const { ciphertext, iv, authTag } = encryptClinicalRecord(params.content);
  const now = new Date().toISOString();

  // Si ya había un borrador de esta misma nota, se reescribe (sigue siendo
  // "editable" porque nunca se finalizó) — se valida dueño y que de verdad
  // siga en estado draft antes de tocarlo, ya que no hay política de UPDATE
  // que lo haga por nosotros.
  if (params.existingDraftId) {
    const { data: existing } = await serviceClient
      .from("session_notes")
      .select("id, therapist_id, status")
      .eq("id", params.existingDraftId)
      .maybeSingle();

    if (!existing || existing.therapist_id !== user.id || existing.status !== "draft") return;

    await serviceClient
      .from("session_notes")
      .update({
        ciphertext,
        iv,
        auth_tag: authTag,
        risk_level: params.riskLevel,
        enfoque_familia: params.enfoqueFamilia ?? null,
        status: params.finalize ? "final" : "draft",
        finalized_at: params.finalize ? now : null,
      })
      .eq("id", params.existingDraftId);

    revalidatePath(fichaPath(params.patientId));
    return;
  }

  const sessionNumber = await nextSessionNumber(serviceClient, user.id, params.patientId);

  await serviceClient.from("session_notes").insert({
    therapist_id: user.id,
    patient_id: params.patientId,
    appointment_id: params.appointmentId || null,
    session_number: sessionNumber,
    status: params.finalize ? "final" : "draft",
    risk_level: params.riskLevel,
    enfoque_familia: params.enfoqueFamilia ?? null,
    ciphertext,
    iv,
    auth_tag: authTag,
    finalized_at: params.finalize ? now : null,
  });

  revalidatePath(fichaPath(params.patientId));
}

// Nota complementaria — la única forma de "agregar" algo a una nota ya
// finalizada. Nunca toca el contenido original, solo el arreglo `addenda`
// dentro del blob (se descifra, se le agrega el addendum, se vuelve a
// cifrar con un iv nuevo).
export async function addSessionNoteAddendum(params: {
  noteId: string;
  patientId: string;
  texto: string;
  autor: string;
}) {
  const { user } = await requireGestionaTherapist();
  if (!params.noteId || !params.texto.trim()) return;

  const serviceClient = createServiceClient();
  const { data: note } = await serviceClient
    .from("session_notes")
    .select("id, therapist_id, status, ciphertext, iv, auth_tag")
    .eq("id", params.noteId)
    .maybeSingle();

  if (!note || note.therapist_id !== user.id || note.status !== "final") return;

  const content = decryptClinicalRecord<SessionNoteContent>({
    ciphertext: note.ciphertext as string,
    iv: note.iv as string,
    authTag: note.auth_tag as string,
  });

  const addendum: SessionNoteAddendum = {
    fechaIso: new Date().toISOString(),
    autor: params.autor,
    texto: params.texto.trim(),
  };
  content.addenda = [...(content.addenda ?? []), addendum];

  const { ciphertext, iv, authTag } = encryptClinicalRecord(content);
  await serviceClient
    .from("session_notes")
    .update({ ciphertext, iv, auth_tag: authTag })
    .eq("id", params.noteId);

  revalidatePath(fichaPath(params.patientId));
}

// ─────────────────────────────────────────────
// Campos personalizados — catálogo por terapeuta, se ofrece de nuevo en
// notas futuras de cualquier paciente.
// ─────────────────────────────────────────────
export async function saveCustomField(nombre: string) {
  const { supabase, user } = await requireGestionaTherapist();
  const trimmed = nombre.trim();
  if (!trimmed) return;

  await supabase
    .from("session_note_custom_fields")
    .upsert({ therapist_id: user.id, nombre: trimmed }, { onConflict: "therapist_id,nombre" });
}

// ─────────────────────────────────────────────
// Evaluaciones — cifradas, sin edición (solo agregar / eliminar suave).
// ─────────────────────────────────────────────
export async function createEvaluation(formData: FormData) {
  const { supabase, user } = await requireGestionaTherapist();
  const patientId = String(formData.get("patient_id") || "");
  const instrumento = String(formData.get("instrumento") || "").trim();
  if (!patientId || !(await verifyRelationship(supabase, user.id, patientId))) return;
  if (!instrumento) return;

  const content: EvaluationContent = {
    puntaje: String(formData.get("puntaje") || "").trim() || undefined,
    interpretacion: String(formData.get("interpretacion") || "").trim() || undefined,
  };
  const { ciphertext, iv, authTag } = encryptClinicalRecord(content);

  await supabase.from("patient_evaluations").insert({
    therapist_id: user.id,
    patient_id: patientId,
    instrumento,
    fecha: String(formData.get("fecha") || "") || new Date().toISOString().slice(0, 10),
    ciphertext,
    iv,
    auth_tag: authTag,
  });

  revalidatePath(fichaPath(patientId));
}

// ─────────────────────────────────────────────
// Pago en efectivo — "Consulta pagada".
// ─────────────────────────────────────────────
export async function markCashConfirmed(formData: FormData) {
  const { supabase, user } = await requireGestionaTherapist();
  const appointmentId = String(formData.get("appointment_id") || "");
  const patientId = String(formData.get("patient_id") || "");
  if (!appointmentId) return;

  await supabase
    .from("appointments")
    .update({ cash_confirmed_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("therapist_id", user.id)
    .eq("payment_status", "efectivo");

  if (patientId) revalidatePath(fichaPath(patientId));
}

// ─────────────────────────────────────────────
// Vincular con paciente anterior.
// ─────────────────────────────────────────────
export async function searchOwnPatients(query: string) {
  const { supabase, user } = await requireGestionaTherapist();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data } = await supabase
    .from("patient_clinical_profile")
    .select("patient_id, full_name")
    .eq("therapist_id", user.id)
    .ilike("full_name", `%${trimmed}%`)
    .limit(10);

  return (data ?? []) as { patient_id: string; full_name: string | null }[];
}

// ─────────────────────────────────────────────
// Documentos compartidos y consentimientos. Límite de 20MB por archivo —
// pasado eso, la UI (ver documentos-tab.tsx) sugiere subirlo a Google Drive
// y pegar el link aquí en vez de forzar la subida. `note` es texto libre:
// puede ser un comentario o un link externo, no necesariamente ambos con
// archivo.
// ─────────────────────────────────────────────
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export async function uploadPatientDocument(formData: FormData) {
  const { supabase, user } = await requireGestionaTherapist();
  const patientId = String(formData.get("patient_id") || "");
  const category = String(formData.get("category") || "compartido") as "compartido" | "consentimiento";
  const note = String(formData.get("note") || "").trim() || null;
  const file = formData.get("file") as File | null;

  if (!patientId || !(await verifyRelationship(supabase, user.id, patientId))) return;
  if (file && file.size > MAX_DOCUMENT_BYTES) return;
  if (!file && !note) return;

  let filePath: string | null = null;
  let fileName: string | null = null;
  let fileSizeBytes: number | null = null;

  if (file && file.size > 0) {
    filePath = `${user.id}/${patientId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("patient-documents").upload(filePath, file);
    if (error) return;
    fileName = file.name;
    fileSizeBytes = file.size;
  }

  await supabase.from("patient_documents").insert({
    therapist_id: user.id,
    patient_id: patientId,
    category,
    visible_to_patient: category === "compartido",
    file_path: filePath,
    file_name: fileName,
    file_size_bytes: fileSizeBytes,
    note,
    uploaded_by: user.id,
    uploaded_by_role: "therapist",
  });

  revalidatePath(fichaPath(patientId));
}

export async function deletePatientDocument(formData: FormData) {
  const { user } = await requireGestionaTherapist();
  const documentId = String(formData.get("document_id") || "");
  const patientId = String(formData.get("patient_id") || "");
  if (!documentId) return;

  const serviceClient = createServiceClient();
  const { data: doc } = await serviceClient
    .from("patient_documents")
    .select("id, therapist_id, file_path")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc || doc.therapist_id !== user.id) return;

  if (doc.file_path) {
    await serviceClient.storage.from("patient-documents").remove([doc.file_path as string]);
  }
  await serviceClient.from("patient_documents").delete().eq("id", documentId);

  if (patientId) revalidatePath(fichaPath(patientId));
}

export async function getDocumentDownloadUrl(filePath: string) {
  const { supabase } = await requireGestionaTherapist();
  const { data } = await supabase.storage.from("patient-documents").createSignedUrl(filePath, 60 * 10);
  return data?.signedUrl ?? null;
}

export async function linkPreviousPatient(formData: FormData) {
  const { supabase, user } = await requireGestionaTherapist();
  const patientId = String(formData.get("patient_id") || "");
  const linkedPatientId = String(formData.get("linked_patient_id") || "");
  if (!patientId || !linkedPatientId || patientId === linkedPatientId) return;
  if (!(await verifyRelationship(supabase, user.id, patientId))) return;

  await supabase
    .from("patient_history_links")
    .upsert(
      { therapist_id: user.id, patient_id: patientId, linked_patient_id: linkedPatientId },
      { onConflict: "therapist_id,patient_id" }
    );

  revalidatePath(fichaPath(patientId));
}

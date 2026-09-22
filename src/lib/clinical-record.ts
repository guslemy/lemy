import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptClinicalRecord } from "@/lib/clinical-record-crypto";
import type {
  ClinicalHistoryContent,
  SessionNoteContent,
  EvaluationContent,
} from "@/lib/clinical-record-crypto";

// Funciones de lectura para la ficha del paciente (plan Gestiona) — todas
// reciben el supabase client ya autenticado como el terapeuta dueño (RLS
// hace el resto). El descifrado ocurre aquí, del lado del servidor, igual
// que ya hacía [id]/page.tsx con clinical_notes: el navegador nunca ve
// ciphertext ni la llave.

export type ClinicalProfile = {
  fullName: string | null;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  referralSource: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
};

export async function getClinicalProfile(
  supabase: SupabaseClient,
  therapistId: string,
  patientId: string
): Promise<ClinicalProfile | null> {
  const { data } = await supabase
    .from("patient_clinical_profile")
    .select("*")
    .eq("therapist_id", therapistId)
    .eq("patient_id", patientId)
    .maybeSingle();

  if (!data) return null;
  return {
    fullName: data.full_name,
    birthDate: data.birth_date,
    phone: data.phone,
    email: data.email,
    occupation: data.occupation,
    referralSource: data.referral_source,
    address: data.address,
    emergencyContactName: data.emergency_contact_name,
    emergencyContactRelationship: data.emergency_contact_relationship,
    emergencyContactPhone: data.emergency_contact_phone,
  };
}

// Igual que con clinical_notes: si el descifrado truena (llave rotada sin
// re-cifrar), se avisa en vez de tronar el render de toda la ficha —
// devuelve null y quien llama decide cómo mostrarlo (ver decryptFailed).
function safeDecrypt<T>(row: { ciphertext: string; iv: string; auth_tag: string }): T | null {
  try {
    return decryptClinicalRecord<T>({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag });
  } catch {
    return null;
  }
}

export async function getClinicalHistory(
  supabase: SupabaseClient,
  therapistId: string,
  patientId: string
): Promise<{ content: ClinicalHistoryContent; updatedAtIso: string } | null> {
  const { data } = await supabase
    .from("patient_clinical_history")
    .select("ciphertext, iv, auth_tag, updated_at")
    .eq("therapist_id", therapistId)
    .eq("patient_id", patientId)
    .maybeSingle();

  if (!data) return null;
  const content = safeDecrypt<ClinicalHistoryContent>(data);
  return { content: content ?? {}, updatedAtIso: data.updated_at as string };
}

export type SessionNoteRow = {
  id: string;
  sessionNumber: number;
  status: "draft" | "final";
  riskLevel: "ninguno" | "a_vigilar" | "riesgo_alto";
  enfoqueFamilia: string | null;
  createdAtIso: string;
  finalizedAtIso: string | null;
  content: SessionNoteContent | null;
  decryptFailed: boolean;
};

export async function listSessionNotes(
  supabase: SupabaseClient,
  therapistId: string,
  patientId: string
): Promise<SessionNoteRow[]> {
  const { data } = await supabase
    .from("session_notes")
    .select("id, session_number, status, risk_level, enfoque_familia, ciphertext, iv, auth_tag, created_at, finalized_at")
    .eq("therapist_id", therapistId)
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("session_number", { ascending: false });

  return (data ?? []).map((n) => {
    const content = safeDecrypt<SessionNoteContent>(n);
    return {
      id: n.id as string,
      sessionNumber: n.session_number as number,
      status: n.status as "draft" | "final",
      riskLevel: n.risk_level as "ninguno" | "a_vigilar" | "riesgo_alto",
      enfoqueFamilia: n.enfoque_familia as string | null,
      createdAtIso: n.created_at as string,
      finalizedAtIso: n.finalized_at as string | null,
      content,
      decryptFailed: content === null,
    };
  });
}

// Buscador de notas: trae candidatas por pareja terapeuta-paciente (ya
// acotado por RLS/parámetros, nunca "todas las notas de todos"), descifra
// y filtra en memoria por el término — no hay índice de búsqueda especial,
// a esta escala (cientos de notas por paciente como mucho) es más que
// suficiente.
export async function searchSessionNotes(
  supabase: SupabaseClient,
  therapistId: string,
  patientId: string,
  query: string
): Promise<SessionNoteRow[]> {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  const all = await listSessionNotes(supabase, therapistId, patientId);
  return all.filter((note) => {
    if (!note.content) return false;
    const haystack = [
      note.content.foco,
      note.content.observaciones,
      note.content.intervenciones,
      note.content.acuerdos,
      note.content.riesgo?.descripcion,
      ...(note.content.camposDinamicos ?? []).map((f) => `${f.nombre} ${f.valor}`),
      ...(note.content.addenda ?? []).map((a) => a.texto),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

export async function listCustomFields(
  supabase: SupabaseClient,
  therapistId: string
): Promise<{ id: string; nombre: string }[]> {
  const { data } = await supabase
    .from("session_note_custom_fields")
    .select("id, nombre")
    .eq("therapist_id", therapistId)
    .order("nombre", { ascending: true });
  return (data ?? []) as { id: string; nombre: string }[];
}

export type EvaluationRow = {
  id: string;
  instrumento: string;
  fechaIso: string;
  content: EvaluationContent | null;
};

export async function listEvaluations(
  supabase: SupabaseClient,
  therapistId: string,
  patientId: string
): Promise<EvaluationRow[]> {
  const { data } = await supabase
    .from("patient_evaluations")
    .select("id, instrumento, fecha, ciphertext, iv, auth_tag")
    .eq("therapist_id", therapistId)
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("fecha", { ascending: false });

  return (data ?? []).map((e) => ({
    id: e.id as string,
    instrumento: e.instrumento as string,
    fechaIso: e.fecha as string,
    content: safeDecrypt<EvaluationContent>(e),
  }));
}

export type PatientDocumentRow = {
  id: string;
  category: "compartido" | "consentimiento";
  filePath: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  note: string | null;
  uploadedByRole: "therapist" | "patient";
  createdAtIso: string;
};

// ─────────────────────────────────────────────
// Vincular con paciente anterior — ver patient_history_links (0040).
// ─────────────────────────────────────────────
export type HistoryLinkSummary = {
  linkedPatientId: string;
  linkedFullName: string | null;
  finalizedNotesCount: number;
  historyUpdatedAtIso: string | null;
};

export async function getHistoryLink(
  supabase: SupabaseClient,
  therapistId: string,
  patientId: string
): Promise<HistoryLinkSummary | null> {
  const { data: link } = await supabase
    .from("patient_history_links")
    .select("linked_patient_id")
    .eq("therapist_id", therapistId)
    .eq("patient_id", patientId)
    .maybeSingle();

  if (!link) return null;
  const linkedPatientId = link.linked_patient_id as string;

  const [{ data: linkedProfile }, { count: notesCount }, { data: historyRow }] = await Promise.all([
    supabase
      .from("patient_clinical_profile")
      .select("full_name")
      .eq("therapist_id", therapistId)
      .eq("patient_id", linkedPatientId)
      .maybeSingle(),
    supabase
      .from("session_notes")
      .select("id", { count: "exact", head: true })
      .eq("therapist_id", therapistId)
      .eq("patient_id", linkedPatientId)
      .eq("status", "final")
      .is("deleted_at", null),
    supabase
      .from("patient_clinical_history")
      .select("updated_at")
      .eq("therapist_id", therapistId)
      .eq("patient_id", linkedPatientId)
      .maybeSingle(),
  ]);

  return {
    linkedPatientId,
    linkedFullName: (linkedProfile?.full_name as string | undefined) ?? null,
    finalizedNotesCount: notesCount ?? 0,
    historyUpdatedAtIso: (historyRow?.updated_at as string | undefined) ?? null,
  };
}

export async function listPatientDocuments(
  supabase: SupabaseClient,
  therapistId: string,
  patientId: string
): Promise<PatientDocumentRow[]> {
  const { data } = await supabase
    .from("patient_documents")
    .select("id, category, file_path, file_name, file_size_bytes, note, uploaded_by_role, created_at")
    .eq("therapist_id", therapistId)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((d) => ({
    id: d.id as string,
    category: d.category as "compartido" | "consentimiento",
    filePath: d.file_path as string | null,
    fileName: d.file_name as string | null,
    fileSizeBytes: d.file_size_bytes as number | null,
    note: d.note as string | null,
    uploadedByRole: d.uploaded_by_role as "therapist" | "patient",
    createdAtIso: d.created_at as string,
  }));
}

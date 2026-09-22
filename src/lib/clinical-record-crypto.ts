import { encryptClinicalNote, decryptClinicalNote, type EncryptedNote } from "./clinical-notes-crypto";

// Envoltura delgada sobre clinical-notes-crypto.ts para cifrar contenido
// ESTRUCTURADO (historia clínica, notas de sesión, evaluaciones) en vez de
// un solo texto libre — mismo AES-256-GCM, misma llave
// (CLINICAL_NOTES_ENCRYPTION_KEY), cero cambios al esquema de cifrado. Lo
// único distinto es que aquí se cifra el JSON.stringify de un objeto, no un
// string ya escrito por el usuario.
export function encryptClinicalRecord<T>(data: T): EncryptedNote {
  return encryptClinicalNote(JSON.stringify(data));
}

export function decryptClinicalRecord<T>(note: EncryptedNote): T {
  return JSON.parse(decryptClinicalNote(note)) as T;
}

// ─────────────────────────────────────────────
// Formas de los blobs que se cifran — un solo lugar para no desincronizar
// lo que escribe cada server action con lo que espera de vuelta la UI.
// ─────────────────────────────────────────────

// Historia clínica — los ~19 campos del mockup, agrupados igual que en la
// UI (Motivo y contexto / Historia clínica y de salud / Desarrollo y
// trayectoria / Contexto relacional y de vida / Valoración clínica / Plan
// de trabajo). Todos opcionales: el terapeuta llena lo que tiene, cuando
// lo tiene.
export type ClinicalHistoryContent = {
  motivoDetallado?: string;
  antecedentesPersonales?: string;
  antecedentesFamiliares?: string;
  antecedentesPsicologicosPsiquiatricos?: string;
  antecedentesMedicos?: string;
  tratamientosPreviosActuales?: string;
  tratamientoPsiquiatricoActual?: string;
  medicacionActual?: string;
  antecedentesDelDesarrollo?: string;
  historiaEscolarLaboral?: string;
  relacionesInterpersonales?: string;
  acontecimientosVitalesSignificativos?: string;
  habitosEstiloDeVida?: string;
  evaluacionesDiagnosticosPrevios?: string;
  observacionesImpresionClinica?: string;
  factoresDeRiesgoProtectores?: string;
  objetivosTerapeuticos?: string;
  planTerapeutico?: string;
  informacionAdicional?: string;
};

export type RiskDetail = {
  tipo?: string;
  valoracionRealizada?: string;
  descripcion?: string;
  accionesTomadas?: string;
  canalizacionReferencia?: string;
  seguimientoRequerido?: string;
};

export type SessionNoteAddendum = {
  fechaIso: string;
  autor: string;
  texto: string;
};

export type DynamicField = {
  nombre: string;
  valor: string;
};

// Contenido cifrado de una nota de sesión. session_number / risk_level /
// enfoque_familia van también como columnas planas en session_notes (ver
// 0040) para poder pintar la lista sin descifrar cada fila — aquí se
// repiten dentro del blob solo por conveniencia al reconstruir el PDF/la
// vista completa desde un solo objeto descifrado.
export type SessionNoteContent = {
  fechaHoraIso: string;
  duracionMin: number;
  foco?: string;
  observaciones?: string;
  intervenciones?: string;
  acuerdos?: string;
  riesgo?: RiskDetail;
  camposDinamicos: DynamicField[];
  addenda: SessionNoteAddendum[];
};

export type EvaluationContent = {
  puntaje?: string;
  interpretacion?: string;
};

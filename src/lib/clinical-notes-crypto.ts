import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

// Cifrado a nivel de aplicación para el historial clínico (ver
// 0035_clinical_notes.sql) — decisión explícita de Gustavo (2026-08-26):
// ni con acceso directo a la base de datos se debe poder leer una nota en
// texto plano. AES-256-GCM: cifrado simétrico autenticado (el auth_tag
// detecta si el ciphertext fue alterado, no solo lo descifra).
//
// La llave (CLINICAL_NOTES_ENCRYPTION_KEY) vive SOLO en el servidor — nunca
// se manda al navegador, nunca se prefija con NEXT_PUBLIC_. Este archivo no
// tiene "use server" porque no es una Server Action en sí, pero solo se
// importa desde código server-only (Server Actions, Server Components) —
// usa el módulo `node:crypto`, que no existe en el navegador, así que
// importarlo desde un componente cliente truena el build.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recomendado para GCM (96 bits)

function getKey(): Buffer {
  const raw = process.env.CLINICAL_NOTES_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Falta CLINICAL_NOTES_ENCRYPTION_KEY — sin esta variable no se puede cifrar ni descifrar el historial clínico."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("CLINICAL_NOTES_ENCRYPTION_KEY debe decodificar a exactamente 32 bytes (AES-256).");
  }
  return key;
}

export function isClinicalNotesEncryptionConfigured(): boolean {
  return Boolean(process.env.CLINICAL_NOTES_ENCRYPTION_KEY);
}

export type EncryptedNote = { ciphertext: string; iv: string; authTag: string };

export function encryptClinicalNote(plaintext: string): EncryptedNote {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptClinicalNote(note: EncryptedNote): string {
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(note.iv, "base64"));
  decipher.setAuthTag(Buffer.from(note.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(note.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

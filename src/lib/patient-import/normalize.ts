// Utilidades puras del importador de pacientes: normalizar nombres, teléfonos
// y correos, adivinar el mapeo de columnas (estilo HubSpot) y detectar
// duplicados. Sin dependencias de servidor, para poder usarse en el navegador
// y en el servidor.

export type ImportRow = {
  rowNumber: number; // fila del archivo (para mostrar al terapeuta)
  fullName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null; // YYYY-MM-DD
  age: number | null;
  city: string | null;
  sourceCreatedAt: string | null; // YYYY-MM-DD
};

export const PLACEHOLDER_EMAIL_DOMAIN = "importados.lemy.mx";

export function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizeName(s: string) {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Mismo nombre sin importar el orden de las palabras ("Pérez Ana" = "Ana Pérez").
export function nameKey(s: string) {
  return normalizeName(s).split(" ").filter(Boolean).sort().join(" ");
}

// Últimos 10 dígitos (México). null si hay menos de 10.
export function normalizePhone10(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "htmail.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "icloud.con": "icloud.com",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string | null | undefined): {
  email: string | null;
  corrected: boolean;
  invalid: boolean;
} {
  const trimmed = (raw ?? "").trim().toLowerCase();
  if (!trimmed) return { email: null, corrected: false, invalid: false };
  if (!EMAIL_RE.test(trimmed)) return { email: null, corrected: false, invalid: true };
  const [local, domain] = trimmed.split("@");
  const fixed = DOMAIN_FIXES[domain];
  if (fixed) return { email: `${local}@${fixed}`, corrected: true, invalid: false };
  return { email: trimmed, corrected: false, invalid: false };
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// 0 a 1. Compara nombres sin acentos y sin importar el orden de las palabras.
export function nameSimilarity(a: string, b: string) {
  const ka = nameKey(a);
  const kb = nameKey(b);
  if (!ka || !kb) return 0;
  const max = Math.max(ka.length, kb.length);
  return 1 - levenshtein(ka, kb) / max;
}

export function ageFromBirthDate(birthDate: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export function rowAge(row: Pick<ImportRow, "birthDate" | "age">): number | null {
  if (row.birthDate) {
    const a = ageFromBirthDate(row.birthDate);
    if (a !== null) return a;
  }
  return row.age;
}

export function isMinorRow(row: Pick<ImportRow, "birthDate" | "age">): boolean {
  const a = rowAge(row);
  return a !== null && a < 18;
}

// ── Mapeo automático de columnas ───────────────────────────────────────
export type FieldKey =
  | "fullName"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "birthDate"
  | "birthDay"
  | "birthMonth"
  | "birthYear"
  | "age"
  | "city"
  | "createdAt";

export const FIELD_LABELS: Record<FieldKey, string> = {
  fullName: "Nombre completo",
  firstName: "Nombre(s)",
  lastName: "Apellidos",
  email: "Correo",
  phone: "Teléfono",
  birthDate: "Fecha de nacimiento (completa)",
  birthDay: "Día de nacimiento",
  birthMonth: "Mes de nacimiento",
  birthYear: "Año de nacimiento",
  age: "Edad",
  city: "Ciudad",
  createdAt: "Fecha de alta",
};

const SYNONYMS: Record<FieldKey, string[]> = {
  fullName: ["nombre completo", "paciente", "cliente", "nombre y apellido", "name"],
  firstName: ["nombres", "nombre", "nombre s", "first name", "primer nombre"],
  lastName: ["apellidos", "apellido", "last name"],
  email: ["email", "e mail", "correo", "correo electronico", "mail"],
  phone: ["telefono", "celular", "movil", "whatsapp", "tel", "numero de telefono", "phone"],
  birthDate: ["fecha de nacimiento", "fecha nacimiento", "nacimiento", "birthday", "birth date"],
  birthDay: ["dia del nacimiento", "dia de nacimiento", "dia nacimiento"],
  birthMonth: ["mes del nacimiento", "mes de nacimiento", "mes nacimiento"],
  birthYear: ["ano de nacimiento", "ano del nacimiento", "ano nacimiento"],
  age: ["edad", "age"],
  city: ["ciudad", "city", "municipio"],
  createdAt: ["fecha de creacion", "fecha de alta", "fecha de registro", "creado", "created"],
};

function normHeader(h: unknown) {
  return stripAccents(String(h ?? ""))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type Mapping = Partial<Record<FieldKey, number>>; // índice de columna

export function guessMapping(headers: unknown[]): Mapping {
  const normalized = headers.map(normHeader);
  const mapping: Mapping = {};
  const used = new Set<number>();

  // Primero coincidencia exacta, luego "empieza con" (evita que "Teléfono
  // secundario" le gane a "Teléfono").
  const order: FieldKey[] = [
    "email",
    "birthDay",
    "birthMonth",
    "birthYear",
    "birthDate",
    "createdAt",
    "phone",
    "fullName",
    "lastName",
    "firstName",
    "age",
    "city",
  ];
  for (const field of order) {
    let idx = normalized.findIndex((h, i) => !used.has(i) && SYNONYMS[field].includes(h));
    if (idx === -1) {
      idx = normalized.findIndex(
        (h, i) =>
          !used.has(i) && !h.includes("secundario") && SYNONYMS[field].some((s) => h === s || h.startsWith(`${s} `))
      );
    }
    if (idx !== -1) {
      mapping[field] = idx;
      used.add(idx);
    }
  }
  return mapping;
}

function cellString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function parseDateLoose(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

// Convierte la tabla del archivo (primera fila = encabezados) en filas de
// importación según el mapeo elegido.
export function buildRows(table: unknown[][], mapping: Mapping): ImportRow[] {
  const rows: ImportRow[] = [];
  const get = (r: unknown[], f: FieldKey) => (mapping[f] === undefined ? undefined : r[mapping[f] as number]);

  for (let i = 1; i < table.length; i++) {
    const r = table[i] ?? [];
    if (!r.some((c) => cellString(c) !== "")) continue;

    const first = cellString(get(r, "firstName"));
    const last = cellString(get(r, "lastName"));
    const full = cellString(get(r, "fullName"));
    const fullName = (full || `${first} ${last}`).replace(/\s+/g, " ").trim();

    let birthDate = parseDateLoose(get(r, "birthDate"));
    if (!birthDate && mapping.birthYear !== undefined) {
      const y = Number(cellString(get(r, "birthYear")));
      const mo = Number(cellString(get(r, "birthMonth")));
      const d = Number(cellString(get(r, "birthDay")));
      if (y > 1900 && y < 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        birthDate = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }

    // La edad puede venir como "3", "3 años", "3 años 4 meses" o "8 meses":
    // se toma el primer número; si solo hay meses, cuenta como 0 años.
    const ageText = cellString(get(r, "age")).toLowerCase();
    const ageMatch = /\d+(?:[.,]\d+)?/.exec(ageText);
    let ageRaw = ageMatch ? Number(ageMatch[0].replace(",", ".")) : NaN;
    if (Number.isFinite(ageRaw) && /mes/.test(ageText) && !/a(ñ|n)o/.test(ageText)) ageRaw = 0;
    rows.push({
      rowNumber: i + 1,
      fullName,
      email: cellString(get(r, "email")) || null,
      phone: cellString(get(r, "phone")) || null,
      birthDate,
      age: Number.isFinite(ageRaw) && ageRaw >= 0 && ageRaw < 120 ? Math.round(ageRaw) : null,
      city: cellString(get(r, "city")) || null,
      sourceCreatedAt: parseDateLoose(get(r, "createdAt")),
    });
  }
  return rows;
}

// ── Duplicados ─────────────────────────────────────────────────────────
export type NormRow = {
  rowNumber: number;
  fullName: string;
  email: string | null; // ya normalizado
  phone10: string | null;
  birthYear: number | null;
};

export function toNorm(row: ImportRow): NormRow {
  return {
    rowNumber: row.rowNumber,
    fullName: row.fullName,
    email: normalizeEmail(row.email).email,
    phone10: normalizePhone10(row.phone),
    birthYear: row.birthDate ? Number(row.birthDate.slice(0, 4)) : null,
  };
}

// ¿Son la misma persona? Un teléfono compartido NO basta (familias, hermanos,
// padres e hijos comparten teléfono): se pide además un nombre parecido.
export function samePerson(a: NormRow, b: NormRow): { same: boolean; reasons: string[] } {
  const sim = nameSimilarity(a.fullName, b.fullName);
  const reasons: string[] = [];
  const emailSame = Boolean(a.email && b.email && a.email === b.email);
  const phoneSame = Boolean(a.phone10 && b.phone10 && a.phone10 === b.phone10);
  const yearOk = a.birthYear === null || b.birthYear === null || a.birthYear === b.birthYear;

  if (emailSame && sim >= 0.5) reasons.push("mismo correo");
  if (phoneSame && sim >= 0.6) reasons.push("mismo teléfono");
  if (sim >= 0.93 && yearOk) reasons.push("nombre casi igual");
  return { same: reasons.length > 0, reasons };
}

// Agrupa filas que parecen ser la misma persona (unión de pares).
export function clusterDuplicates(rows: NormRow[]): Map<number, { groupId: number; reasons: string[] }> {
  const parent = rows.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const reasonsByIndex = new Map<number, Set<string>>();

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const { same, reasons } = samePerson(rows[i], rows[j]);
      if (!same) continue;
      parent[find(i)] = find(j);
      for (const idx of [i, j]) {
        const set = reasonsByIndex.get(idx) ?? new Set<string>();
        reasons.forEach((r) => set.add(r));
        reasonsByIndex.set(idx, set);
      }
    }
  }

  const sizes = new Map<number, number>();
  rows.forEach((_, i) => sizes.set(find(i), (sizes.get(find(i)) ?? 0) + 1));

  const out = new Map<number, { groupId: number; reasons: string[] }>();
  rows.forEach((r, i) => {
    const root = find(i);
    if ((sizes.get(root) ?? 0) > 1) {
      out.set(r.rowNumber, { groupId: root + 1, reasons: [...(reasonsByIndex.get(i) ?? [])] });
    }
  });
  return out;
}

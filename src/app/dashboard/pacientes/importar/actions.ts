"use server";

import { redirect } from "next/navigation";
import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPatientInfoMap } from "@/lib/patient-info";
import {
  PLACEHOLDER_EMAIL_DOMAIN,
  clusterDuplicates,
  isMinorRow,
  nameSimilarity,
  normalizeEmail,
  normalizePhone10,
  rowAge,
  toNorm,
  type ImportRow,
} from "@/lib/patient-import/normalize";

// Acciones del importador de pacientes. Todo corre en el servidor con el
// cliente de servicio (crear cuentas de paciente requiere permiso de admin),
// pero SIEMPRE validando antes que quien llama es un terapeuta, y solo
// tocando datos de ese terapeuta.

const MAX_ROWS = 3000;

async function requireTherapist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "therapist") redirect("/dashboard");
  return { supabase, user };
}

export type RowAnalysis = {
  rowNumber: number;
  email: string | null;
  emailCorrected: boolean;
  emailInvalid: boolean;
  phone10: string | null;
  isMinor: boolean;
  ageKnown: boolean;
  groupId: number | null;
  groupReasons: string[];
  keepInGroup: boolean; // la fila "principal" del grupo de duplicados
  existsInLemy: boolean; // el correo ya tiene cuenta en Lemy
  alreadyYours: boolean; // ya es paciente de este terapeuta
  sharesPhoneWith: string | null; // otra fila del archivo con el mismo teléfono y otro nombre
  defaultSelected: boolean;
};

export type AnalysisResult =
  | { ok: true; rows: RowAnalysis[] }
  | { ok: false; error: string };

// Paso de revisión: NO guarda nada. Calcula duplicados, menores y quién ya
// existe, para que el terapeuta decida antes de importar.
export async function analyzeImport(rows: ImportRow[]): Promise<AnalysisResult> {
  const { supabase, user } = await requireTherapist();
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: "El archivo no tiene filas." };
  if (rows.length > MAX_ROWS) return { ok: false, error: `El archivo tiene más de ${MAX_ROWS} filas. Divídelo en partes.` };

  const service = createServiceClient();
  const norm = rows.map(toNorm);
  const clusters = clusterDuplicates(norm);

  // Cuentas que ya existen en Lemy (solo por correo).
  const emails = Array.from(new Set(norm.map((n) => n.email).filter((e): e is string => Boolean(e))));
  const existing = new Set<string>();
  for (let i = 0; i < emails.length; i += 500) {
    const { data } = await service.rpc("lemy_existing_emails", { p_emails: emails.slice(i, i + 500) });
    for (const r of (data ?? []) as { email: string }[]) existing.add(r.email.toLowerCase());
  }

  // Pacientes que este terapeuta ya tiene (citas o importados antes).
  const { data: apptRows } = await supabase.from("appointments").select("patient_id").eq("therapist_id", user.id);
  const { data: tpRows } = await supabase.from("therapist_patients").select("patient_id").eq("therapist_id", user.id);
  const mineIds = Array.from(
    new Set([...(apptRows ?? []), ...(tpRows ?? [])].map((r) => r.patient_id as string))
  );
  const mine = mineIds.length ? await getPatientInfoMap(supabase, user.id, mineIds) : new Map();
  const mineList = [...mine.values()] as { fullName: string | null; email: string | null; phone: string | null }[];

  // Para el aviso de "comparte teléfono con...".
  const byPhone = new Map<string, ImportRow[]>();
  rows.forEach((r, i) => {
    const p = norm[i].phone10;
    if (p) byPhone.set(p, [...(byPhone.get(p) ?? []), r]);
  });

  // Fila "principal" de cada grupo: la que trae más datos (y más reciente).
  const score = (r: ImportRow) =>
    (normalizeEmail(r.email).email ? 2 : 0) + (normalizePhone10(r.phone) ? 2 : 0) + (r.birthDate ? 1 : 0);
  const groupBest = new Map<number, ImportRow>();
  rows.forEach((r) => {
    const g = clusters.get(r.rowNumber);
    if (!g) return;
    const best = groupBest.get(g.groupId);
    if (
      !best ||
      score(r) > score(best) ||
      (score(r) === score(best) && (r.sourceCreatedAt ?? "") > (best.sourceCreatedAt ?? ""))
    ) {
      groupBest.set(g.groupId, r);
    }
  });

  const result: RowAnalysis[] = rows.map((r, i) => {
    const n = norm[i];
    const em = normalizeEmail(r.email);
    const g = clusters.get(r.rowNumber) ?? null;
    const keep = !g || groupBest.get(g.groupId)?.rowNumber === r.rowNumber;
    const existsInLemy = Boolean(n.email && existing.has(n.email));
    const alreadyYours = mineList.some((m) => {
      const mEmail = normalizeEmail(m.email).email;
      const mPhone = normalizePhone10(m.phone);
      const sim = nameSimilarity(r.fullName, m.fullName ?? "");
      return (
        (n.email && mEmail && n.email === mEmail && sim >= 0.5) ||
        (n.phone10 && mPhone && n.phone10 === mPhone && sim >= 0.6) ||
        sim >= 0.93
      );
    });
    const other = n.phone10
      ? (byPhone.get(n.phone10) ?? []).find((o) => o.rowNumber !== r.rowNumber && nameSimilarity(o.fullName, r.fullName) < 0.5)
      : undefined;

    const hasName = r.fullName.trim().length >= 2;
    return {
      rowNumber: r.rowNumber,
      email: em.email,
      emailCorrected: em.corrected,
      emailInvalid: em.invalid,
      phone10: n.phone10,
      isMinor: isMinorRow(r),
      ageKnown: rowAge(r) !== null,
      groupId: g?.groupId ?? null,
      groupReasons: g?.reasons ?? [],
      keepInGroup: keep,
      existsInLemy,
      alreadyYours,
      sharesPhoneWith: other ? other.fullName : null,
      defaultSelected: hasName && keep && !existsInLemy && !alreadyYours,
    };
  });

  return { ok: true, rows: result };
}

// ── Importar ───────────────────────────────────────────────────────────
export async function startImportBatch(params: {
  filename: string;
  totalRows: number;
  accepted: boolean;
}): Promise<{ ok: true; batchId: string } | { ok: false; error: string }> {
  const { user } = await requireTherapist();
  if (!params.accepted) return { ok: false, error: "Falta aceptar la autorización." };

  const service = createServiceClient();
  const { data, error } = await service
    .from("patient_import_batches")
    .insert({
      therapist_id: user.id,
      filename: params.filename.slice(0, 200),
      total_rows: Math.max(0, Math.floor(params.totalRows)),
      authorization_accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo iniciar la importación." };
  return { ok: true, batchId: data.id as string };
}

export type CommitRow = ImportRow & {
  guardian?: { name: string; phone: string | null; email: string | null; relationship: string | null } | null;
};

export type CommitResult = { rowNumber: number; ok: boolean; patientId?: string; error?: string };

// Importa un lote pequeño de filas (el navegador llama varias veces, para no
// pasarse del tiempo máximo de una acción). Cada fila: cuenta sin acceso +
// perfil marcado como importado + paciente + relación con el terapeuta.
export async function importChunk(
  batchId: string,
  rows: CommitRow[]
): Promise<{ ok: true; results: CommitResult[] } | { ok: false; error: string }> {
  const { user } = await requireTherapist();
  const service = createServiceClient();

  const { data: batch } = await service
    .from("patient_import_batches")
    .select("id")
    .eq("id", batchId)
    .eq("therapist_id", user.id)
    .maybeSingle();
  if (!batch) return { ok: false, error: "Lote no encontrado." };
  if (rows.length > 50) return { ok: false, error: "Lote demasiado grande." };

  const results: CommitResult[] = [];

  for (const r of rows) {
    try {
      const fullName = r.fullName.replace(/\s+/g, " ").trim().slice(0, 120);
      if (fullName.length < 2) throw new Error("Sin nombre");

      const minor = isMinorRow(r);
      if (minor && !(r.guardian?.name?.trim() && (r.guardian.phone?.trim() || r.guardian.email?.trim()))) {
        throw new Error("Menor de edad sin adulto responsable");
      }

      const em = normalizeEmail(r.email);
      if (em.email) {
        const { data: exists } = await service.rpc("lemy_existing_emails", { p_emails: [em.email] });
        if ((exists ?? []).length > 0) throw new Error("Ya tiene cuenta en Lemy");
      }
      const authEmail = em.email ?? `import-${randomUUID()}@${PLACEHOLDER_EMAIL_DOMAIN}`;

      const { data: created, error: createErr } = await service.auth.admin.createUser({
        email: authEmail,
        email_confirm: true,
        user_metadata: { full_name: fullName, imported: true },
      });
      if (createErr || !created?.user) throw new Error("No se pudo crear la cuenta");
      const id = created.user.id;

      try {
        const phone = r.phone ? r.phone.trim().slice(0, 30) : null;
        const { error: pErr } = await service.from("profiles").insert({
          id,
          role: "patient",
          full_name: fullName,
          phone,
          is_imported: true,
          push_enabled: false,
          email_whatsapp_enabled: false,
          whatsapp_opt_in: false,
        });
        if (pErr) throw pErr;

        const g = r.guardian;
        const { error: paErr } = await service.from("patients").insert({
          id,
          city: r.city ? r.city.slice(0, 80) : null,
          birth_date: r.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(r.birthDate) ? r.birthDate : null,
          guardian_name: minor ? g?.name.trim().slice(0, 120) || null : null,
          guardian_phone: minor ? g?.phone?.trim().slice(0, 30) || null : null,
          guardian_email: minor ? g?.email?.trim().toLowerCase().slice(0, 120) || null : null,
          guardian_relationship: minor ? g?.relationship?.trim().slice(0, 60) || null : null,
        });
        if (paErr) throw paErr;

        const { error: tpErr } = await service.from("therapist_patients").insert({
          therapist_id: user.id,
          patient_id: id,
          source: "import",
          batch_id: batchId,
          source_created_at: r.sourceCreatedAt ? `${r.sourceCreatedAt}T12:00:00Z` : null,
        });
        if (tpErr) throw tpErr;
      } catch (inner) {
        // Si algo falla a medias, no se deja una cuenta huérfana.
        await service.auth.admin.deleteUser(id).catch(() => undefined);
        throw inner;
      }

      results.push({ rowNumber: r.rowNumber, ok: true, patientId: id });
    } catch (err) {
      results.push({
        rowNumber: r.rowNumber,
        ok: false,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return { ok: true, results };
}

export async function finishImportBatch(batchId: string, imported: number, failed: number) {
  const { user } = await requireTherapist();
  const service = createServiceClient();
  await service
    .from("patient_import_batches")
    .update({ imported_count: imported, failed_count: failed })
    .eq("id", batchId)
    .eq("therapist_id", user.id);
  revalidatePath("/dashboard/pacientes");
}

// ── Invitación manual por correo ───────────────────────────────────────
// Un terapeuta invita a alguien que no vino de un archivo: se crea el mismo
// tipo de registro (cuenta sin acceso, marcada como importada, fuente
// "manual") y se encola la invitación, así todo el flujo es uno solo.
const MANUAL_INVITES_PER_DAY = 20;

export async function inviteByEmail(params: {
  name: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireTherapist();
  const service = createServiceClient();

  const name = String(params.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (name.length < 2) return { ok: false, error: "Escribe el nombre de tu paciente." };
  const em = normalizeEmail(String(params.email ?? ""));
  if (!em.email || em.invalid) return { ok: false, error: "Ese correo no parece válido. Revísalo." };

  // Tope diario para evitar abusos.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("therapist_patients")
    .select("patient_id", { count: "exact", head: true })
    .eq("therapist_id", user.id)
    .eq("source", "manual")
    .gte("created_at", since);
  if ((count ?? 0) >= MANUAL_INVITES_PER_DAY) {
    return { ok: false, error: "Llegaste al límite de invitaciones manuales de hoy. Intenta mañana." };
  }

  const { data: exists } = await service.rpc("lemy_existing_emails", { p_emails: [em.email] });
  if ((exists ?? []).length > 0) {
    return {
      ok: false,
      error: "Esa persona ya tiene cuenta en Lemy. Comparte con ella el enlace de tu perfil para que agende contigo.",
    };
  }

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: em.email,
    email_confirm: true,
    user_metadata: { full_name: name, imported: true },
  });
  if (createErr || !created?.user) return { ok: false, error: "No se pudo crear la invitación. Intenta de nuevo." };
  const id = created.user.id;

  try {
    const { error: pErr } = await service.from("profiles").insert({
      id,
      role: "patient",
      full_name: name,
      is_imported: true,
      push_enabled: false,
      email_whatsapp_enabled: false,
      whatsapp_opt_in: false,
    });
    if (pErr) throw pErr;
    const { error: paErr } = await service.from("patients").insert({ id });
    if (paErr) throw paErr;
    const { error: tpErr } = await service
      .from("therapist_patients")
      .insert({ therapist_id: user.id, patient_id: id, source: "manual" });
    if (tpErr) throw tpErr;
    const { error: invErr } = await service.from("patient_invitations").insert({
      token: randomBytes(24).toString("hex"),
      therapist_id: user.id,
      patient_id: id,
      email: em.email,
    });
    if (invErr) throw invErr;
  } catch {
    // Limpieza: sin esto quedarían filas huérfanas (el borrado de la cuenta no las arrastra).
    await service.from("patient_invitations").delete().eq("patient_id", id);
    await service.from("therapist_patients").delete().eq("patient_id", id);
    await service.from("patients").delete().eq("id", id);
    await service.from("profiles").delete().eq("id", id);
    await service.auth.admin.deleteUser(id).catch(() => undefined);
    return { ok: false, error: "No se pudo crear la invitación. Intenta de nuevo." };
  }

  revalidatePath("/dashboard/pacientes");
  return { ok: true };
}

// ── Invitaciones (cola) ────────────────────────────────────────────────
// Solo se encolan adultos con correo real. Se envían de a poco (tope diario,
// ver lib/patient-invitations.ts); lo que no cabe hoy sigue pendiente.
export async function queueInvitations(
  patientIds: string[]
): Promise<{ queued: number; skipped: number }> {
  const { supabase, user } = await requireTherapist();
  const service = createServiceClient();
  const ids = Array.from(new Set(patientIds)).slice(0, 3000);
  if (ids.length === 0) return { queued: 0, skipped: 0 };

  const { data: mine } = await supabase
    .from("therapist_patients")
    .select("patient_id")
    .eq("therapist_id", user.id)
    .in("patient_id", ids);
  const allowed = new Set((mine ?? []).map((m) => m.patient_id as string));

  let queued = 0;
  let skipped = 0;
  for (const id of ids) {
    if (!allowed.has(id)) {
      skipped += 1;
      continue;
    }
    const { data: prof } = await service
      .from("profiles")
      .select("is_imported, imported_claimed_at")
      .eq("id", id)
      .maybeSingle();
    const { data: pat } = await service.from("patients").select("birth_date, guardian_name").eq("id", id).maybeSingle();
    const { data: au } = await service.auth.admin.getUserById(id);
    const email = au?.user?.email ?? null;

    const minor = pat?.birth_date ? isMinorRow({ birthDate: pat.birth_date as string, age: null }) : Boolean(pat?.guardian_name);
    if (!prof?.is_imported || prof.imported_claimed_at || !email || email.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`) || minor) {
      skipped += 1;
      continue;
    }

    const { error } = await service.from("patient_invitations").insert({
      token: randomBytes(24).toString("hex"),
      therapist_id: user.id,
      patient_id: id,
      email,
    });
    if (error) skipped += 1; // ya estaba en la cola (unique) u otro problema
    else queued += 1;
  }

  revalidatePath("/dashboard/pacientes");
  return { queued, skipped };
}

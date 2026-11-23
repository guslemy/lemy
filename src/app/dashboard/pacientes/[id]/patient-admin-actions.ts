"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { therapistHasPatient } from "@/lib/patient-access";
import { PLACEHOLDER_EMAIL_DOMAIN, normalizeEmail } from "@/lib/patient-import/normalize";

// Acciones del terapeuta sobre un paciente de su lista:
//  - editar los datos de un paciente importado que aún no activa su cuenta
//    (si ya la activó, los datos son suyos y el terapeuta no los cambia);
//  - quitarlo de su lista (y restaurarlo). No borra nada: el expediente se
//    conserva, solo deja de verse en la lista y la búsqueda.

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

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateImportedPatient(params: {
  patientId: string;
  name: string;
  email: string;
  phone: string;
}): Promise<ActionResult> {
  const { supabase, user } = await requireTherapist();
  const service = createServiceClient();
  const id = params.patientId;

  if (!(await therapistHasPatient(supabase, user.id, id))) return { ok: false, error: "No encontramos a este paciente." };

  const { data: prof } = await service
    .from("profiles")
    .select("is_imported, imported_claimed_at, account_closed_at")
    .eq("id", id)
    .maybeSingle();
  if (!prof?.is_imported || prof.imported_claimed_at || prof.account_closed_at) {
    return { ok: false, error: "Estos datos ya no los puedes editar: el paciente tiene su propia cuenta en Lemy." };
  }

  const name = params.name.replace(/\s+/g, " ").trim().slice(0, 120);
  if (name.length < 2) return { ok: false, error: "Escribe el nombre del paciente." };
  const phone = params.phone.trim().slice(0, 30) || null;

  // Correo: vacío = sin correo (cuenta con correo interno de relleno).
  const { data: au } = await service.auth.admin.getUserById(id);
  const currentEmail = (au?.user?.email ?? "").toLowerCase();
  const rawEmail = params.email.trim();
  let newEmail: string;
  if (!rawEmail) {
    newEmail = currentEmail.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)
      ? currentEmail
      : `import-${randomUUID()}@${PLACEHOLDER_EMAIL_DOMAIN}`;
  } else {
    const em = normalizeEmail(rawEmail);
    if (!em.email || em.invalid) return { ok: false, error: "Ese correo no parece válido. Revísalo." };
    newEmail = em.email;
  }

  const emailChanged = newEmail !== currentEmail;
  if (emailChanged && !newEmail.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)) {
    const { data: exists } = await service.rpc("lemy_existing_emails", { p_emails: [newEmail] });
    if ((exists ?? []).length > 0) {
      return {
        ok: false,
        error: "Ese correo ya pertenece a otra cuenta de Lemy. Comparte con esa persona el enlace de tu perfil para que agende contigo.",
      };
    }
  }

  if (emailChanged) {
    const { error } = await service.auth.admin.updateUserById(id, { email: newEmail, email_confirm: true });
    if (error) return { ok: false, error: "No se pudo actualizar el correo. Intenta de nuevo." };
    // Una invitación anterior apuntaba al correo viejo: se descarta para poder invitar de nuevo.
    await service.from("patient_invitations").delete().eq("patient_id", id).eq("therapist_id", user.id);
  }

  const { error: pErr } = await service.from("profiles").update({ full_name: name, phone }).eq("id", id);
  if (pErr) return { ok: false, error: "No se pudieron guardar los datos. Intenta de nuevo." };

  revalidatePath(`/dashboard/pacientes/${id}`);
  revalidatePath("/dashboard/pacientes");
  return { ok: true };
}

// Quitar de mi lista (reversible). No se permite si tiene citas por venir.
export async function hidePatientFromList(patientId: string): Promise<ActionResult> {
  const { supabase, user } = await requireTherapist();
  if (!(await therapistHasPatient(supabase, user.id, patientId))) return { ok: false, error: "No encontramos a este paciente." };

  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", user.id)
    .eq("patient_id", patientId)
    .neq("status", "cancelled")
    .neq("status", "completed")
    .gt("scheduled_at", new Date().toISOString());
  if (count) {
    return { ok: false, error: "Tiene citas por venir. Cancélalas primero y luego podrás quitarlo de tu lista." };
  }

  const { error } = await supabase
    .from("therapist_hidden_patients")
    .upsert({ therapist_id: user.id, patient_id: patientId }, { onConflict: "therapist_id,patient_id" });
  if (error) return { ok: false, error: "No se pudo quitar de tu lista. Intenta de nuevo." };

  revalidatePath("/dashboard/pacientes");
  return { ok: true };
}

export async function restorePatientToList(patientId: string): Promise<ActionResult> {
  const { supabase, user } = await requireTherapist();
  const { error } = await supabase
    .from("therapist_hidden_patients")
    .delete()
    .eq("therapist_id", user.id)
    .eq("patient_id", patientId);
  if (error) return { ok: false, error: "No se pudo restaurar. Intenta de nuevo." };

  revalidatePath("/dashboard/pacientes");
  return { ok: true };
}

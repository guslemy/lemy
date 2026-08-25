"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptClinicalNote } from "@/lib/clinical-notes-crypto";

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

// Crea una nota de sesión — inmutable desde el momento en que se guarda (no
// hay acción de "editar" en ningún lado de la UI, y la tabla no tiene
// política RLS de UPDATE, así que tampoco se puede desde fuera de esta
// acción). Antes de cifrar y guardar, confirma que exista al menos una cita
// entre este terapeuta y este paciente — no cualquiera puede escribir notas
// sobre un paciente que nunca ha visto solo adivinando su id.
export async function createClinicalNote(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const patientId = String(formData.get("patient_id") || "");
  const content = String(formData.get("content") || "").trim();
  if (!patientId || !content) return;

  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", user.id)
    .eq("patient_id", patientId);
  if (!count) return;

  const { ciphertext, iv, authTag } = encryptClinicalNote(content);

  await supabase.from("clinical_notes").insert({
    therapist_id: user.id,
    patient_id: patientId,
    ciphertext,
    iv,
    auth_tag: authTag,
  });

  revalidatePath(`/dashboard/pacientes/${patientId}`);
}

// Borrado suave — la fila nunca se destruye, solo se marca deleted_at y deja
// de mostrarse. Usa el service client (bypassa RLS) a propósito: la tabla no
// tiene política de UPDATE para el terapeuta dueño ni para nadie más, así
// que este es el único camino posible para dar de baja una nota, y por eso
// valida la propiedad a mano antes de tocar nada.
export async function softDeleteClinicalNote(formData: FormData) {
  const { user } = await requireTherapist();
  const noteId = String(formData.get("note_id") || "");
  const patientId = String(formData.get("patient_id") || "");
  if (!noteId) return;

  const serviceClient = createServiceClient();
  const { data: note } = await serviceClient
    .from("clinical_notes")
    .select("id, therapist_id")
    .eq("id", noteId)
    .maybeSingle();

  if (!note || note.therapist_id !== user.id) return;

  await serviceClient
    .from("clinical_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", noteId);

  if (patientId) revalidatePath(`/dashboard/pacientes/${patientId}`);
}

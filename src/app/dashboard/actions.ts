"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { ensureTherapistShell, uniqueTherapistSlug } from "@/lib/supabase/ensure-therapist";

// Paso 1 del onboarding: alguien con cuenta de paciente decide activarse
// como terapeuta. Cambia el rol y crea el registro base en `therapists`.
export async function becomeTherapist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ role: "therapist" }).eq("id", user.id);
  await ensureTherapistShell(supabase, user);

  revalidatePath("/dashboard");
  redirect("/dashboard/perfil");
}

// Paso 2: guarda todo el perfil (datos básicos + especialidades + enfoques).
// El propio terapeuta decide cuándo marcar "is_published".
export async function saveTherapistProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const display_name = String(formData.get("display_name") || "").trim() || "Terapeuta";
  const tagline = String(formData.get("tagline") || "").trim() || null;
  const bio = String(formData.get("bio") || "").trim() || null;
  const city = String(formData.get("city") || "").trim() || "Oaxaca";
  const zona = String(formData.get("zona") || "").trim() || null;

  const languagesRaw = String(formData.get("languages") || "").trim();
  const languages = languagesRaw
    ? languagesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : ["Español"];

  const nichesRaw = String(formData.get("client_niches") || "").trim();
  const client_niches = nichesRaw
    ? nichesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const price_min = formData.get("price_min") ? Number(formData.get("price_min")) : null;
  const price_max = formData.get("price_max") ? Number(formData.get("price_max")) : null;
  const is_online_available = formData.get("is_online_available") === "on";
  const is_published = formData.get("is_published") === "on";

  let slug = slugify(String(formData.get("slug") || "") || display_name);
  const { data: clash } = await supabase
    .from("therapists")
    .select("id")
    .eq("slug", slug)
    .neq("id", user.id)
    .maybeSingle();
  if (clash) slug = await uniqueTherapistSlug(supabase, display_name, user.id);

  await supabase
    .from("therapists")
    .update({
      display_name,
      slug,
      tagline,
      bio,
      city,
      zona,
      languages,
      client_niches,
      price_min,
      price_max,
      is_online_available,
      is_published,
    })
    .eq("id", user.id);

  const specialtyIds = formData.getAll("specialties").map(String);
  await supabase.from("therapist_specialties").delete().eq("therapist_id", user.id);
  if (specialtyIds.length) {
    await supabase
      .from("therapist_specialties")
      .insert(specialtyIds.map((specialty_id) => ({ therapist_id: user.id, specialty_id })));
  }

  const approachIds = formData.getAll("approaches").map(String);
  await supabase.from("therapist_approaches").delete().eq("therapist_id", user.id);
  if (approachIds.length) {
    await supabase
      .from("therapist_approaches")
      .insert(approachIds.map((approach_id) => ({ therapist_id: user.id, approach_id })));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/perfil");
  revalidatePath("/buscar");
  revalidatePath(`/terapeuta/${slug}`);
  redirect("/dashboard?guardado=1");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { ensureTherapistShell, uniqueTherapistSlug } from "@/lib/supabase/ensure-therapist";
import { FOUNDING_MEMBER_LIMIT, TRIAL_DAYS } from "@/lib/stripe";

// Paso 1 del onboarding: alguien con cuenta de paciente decide activarse
// como terapeuta. Cambia el rol, crea el registro base en `therapists`, le
// da 15 días de prueba gratis, y si es de los primeros 30 en activarse lo
// marca como "fundador" (30% de descuento 3 meses + precio bloqueado 1 año,
// cuando se suscriba).
export async function becomeTherapist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ role: "therapist" }).eq("id", user.id);
  await ensureTherapistShell(supabase, user);

  const { data: existing } = await supabase
    .from("therapists")
    .select("trial_ends_at")
    .eq("id", user.id)
    .maybeSingle();

  // Solo la primera vez: si ya tenía trial asignado (reactivación), no lo
  // reiniciamos.
  if (!existing?.trial_ends_at) {
    const { count: founderCount } = await supabase
      .from("therapists")
      .select("id", { count: "exact", head: true })
      .eq("is_founding_member", true);

    const isFounder = (founderCount ?? 0) < FOUNDING_MEMBER_LIMIT;
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from("therapists")
      .update({ trial_ends_at: trialEndsAt, is_founding_member: isFounder })
      .eq("id", user.id);
  }

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
  const wantsPublished = formData.get("is_published") === "on";
  const phone = String(formData.get("phone") || "").trim() || null;

  await supabase.from("profiles").update({ phone }).eq("id", user.id);

  // No se puede publicar sin prueba vigente ni suscripción activa — evita
  // que un perfil quede visible en el buscador sin que haya pago de por
  // medio (una vez pasado el trial).
  let is_published = wantsPublished;
  let blockedBySubscription = false;
  if (wantsPublished) {
    const { data: billing } = await supabase
      .from("therapists")
      .select("trial_ends_at, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    const trialActive = billing?.trial_ends_at
      ? new Date(billing.trial_ends_at).getTime() > Date.now()
      : false;
    const subscriptionActive = billing?.subscription_status === "active";

    if (!trialActive && !subscriptionActive) {
      is_published = false;
      blockedBySubscription = true;
    }
  }

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

  if (blockedBySubscription) {
    redirect("/dashboard/perfil?error=suscripcion");
  }
  redirect("/dashboard?guardado=1");
}

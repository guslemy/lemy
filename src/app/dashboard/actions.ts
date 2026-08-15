"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { ensureTherapistShell, uniqueTherapistSlug } from "@/lib/supabase/ensure-therapist";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";
import { FOUNDING_MEMBER_LIMIT, TRIAL_DAYS } from "@/lib/stripe";
import { dispatch } from "@/lib/notifications/engine";
import { therapistWelcome } from "@/lib/notifications/emailTemplates";

// Deja pasar "instagram.com/tu_usuario" sin obligar a que escriban
// "https://" a mano — si ya trae protocolo, no lo toca.
function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

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
    .select("trial_ends_at, display_name")
    .eq("id", user.id)
    .maybeSingle();

  // Solo la primera vez: si ya tenía trial asignado (reactivación), no lo
  // reiniciamos ni volvemos a mandar el correo de bienvenida.
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

    // Correo 1 de la secuencia de onboarding: cuenta creada, sin pago
    // todavía — invita a elegir plan con la tabla comparativa. No debe
    // bloquear la activación de la cuenta si falla.
    //
    // OJO: no usar emailOf(supabase, user.id) aquí — ese helper llama
    // auth.admin.getUserById, que requiere la service_role key. Este
    // `supabase` es el cliente de sesión normal (clave anónima), así que esa
    // llamada fallaría en silencio (sin lanzar error) y el correo nunca se
    // mandaría. Como el usuario ya está autenticado en esta misma función,
    // user.email ya trae el dato — no hace falta ninguna llamada extra.
    try {
      const email = user.email ?? null;
      const { subject, html } = therapistWelcome({
        name: existing?.display_name || user.user_metadata?.full_name || "ahí",
      });
      await dispatch({
        supabase,
        type: "therapist_welcome",
        relatedId: user.id,
        recipientId: user.id,
        email,
        phone: null,
        subject,
        html,
        emailOnly: true,
      });
    } catch (err) {
      console.error("Error mandando correo de bienvenida de terapeuta:", err);
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?tab=perfil");
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Paso 2: guarda todo el perfil (datos básicos + especialidades + enfoques
// + foto, si viene una nueva en el mismo submit). Antes la foto se subía con
// un botón "Subir foto" aparte — Gustavo pidió que se guarde junto con todo
// lo demás, con un solo click en "Guardar cambios".
// El propio terapeuta decide cuándo marcar "is_published".
export async function saveTherapistProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Foto de perfil (opcional): si viene un archivo nuevo, se valida y sube
  // primero — falla rápido antes de tocar el resto del perfil, igual que
  // antes cuando era su propia acción. Si no viene archivo (el terapeuta
  // solo editó texto), photo_url queda undefined y no se toca la columna.
  let photo_url: string | undefined;
  const photoFile = formData.get("photo") as File | null;
  if (photoFile && photoFile.size > 0) {
    if (!photoFile.type.startsWith("image/")) {
      redirect("/dashboard?tab=perfil&perfil_error=foto");
    }
    if (photoFile.size > MAX_PHOTO_BYTES) {
      redirect("/dashboard?tab=perfil&perfil_error=foto_grande");
    }

    const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/foto.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("therapist-photos")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type });

    if (uploadError) {
      console.error("Error subiendo foto de perfil:", uploadError);
      redirect("/dashboard?tab=perfil&perfil_error=foto");
    }

    const { data: publicUrlData } = supabase.storage.from("therapist-photos").getPublicUrl(path);
    // Le pegamos la hora como query param para reventar el caché del
    // navegador cuando alguien reemplaza su foto con la misma ruta.
    photo_url = `${publicUrlData.publicUrl}?v=${Date.now()}`;
  }

  const display_name = String(formData.get("display_name") || "").trim() || "Terapeuta";
  const tagline = String(formData.get("tagline") || "").trim() || null;
  const bio = String(formData.get("bio") || "").trim() || null;
  const city = String(formData.get("city") || "").trim() || "Oaxaca";
  const zona = String(formData.get("zona") || "").trim() || null;
  const country = String(formData.get("country") || "").trim() || "México";
  const state = String(formData.get("state") || "").trim() || null;

  // Idiomas: checkboxes fijos (ver lib/perfil-catalogos.ts) + un campo libre
  // "Otro" para lo que no esté en la lista — se guardan juntos en el mismo
  // text[] de siempre.
  const languagesChecked = formData.getAll("languages").map(String);
  const languagesOtro = String(formData.get("languages_otro") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const languagesCombined = [...languagesChecked, ...languagesOtro];
  const languages = languagesCombined.length ? languagesCombined : ["Español"];

  // "A quién atiendes" pasó de texto libre a checkboxes de rango de edad
  // (población atendida, ver Notion). Mismo campo client_niches de siempre.
  const client_niches = formData.getAll("client_niches").map(String);
  const therapy_types = formData.getAll("therapy_types").map(String);

  const gender = String(formData.get("gender") || "").trim() || null;
  const profession = String(formData.get("profession") || "").trim() || null;
  const professional_license_number =
    String(formData.get("professional_license_number") || "").trim() || null;
  const university = String(formData.get("university") || "").trim() || null;
  const graduation_year = formData.get("graduation_year")
    ? Number(formData.get("graduation_year"))
    : null;
  const birth_date = String(formData.get("birth_date") || "").trim() || null;

  const price_min = formData.get("price_min") ? Number(formData.get("price_min")) : null;
  const price_max = formData.get("price_max") ? Number(formData.get("price_max")) : null;
  const is_online_available = formData.get("is_online_available") === "on";
  const is_in_person_available = formData.get("is_in_person_available") === "on";
  const address = is_in_person_available
    ? String(formData.get("address") || "").trim() || null
    : null;
  const wantsPublished = formData.get("is_published") === "on";
  const phone = String(formData.get("phone") || "").trim() || null;

  const instagram_url = normalizeUrl(String(formData.get("instagram_url") || ""));
  const facebook_url = normalizeUrl(String(formData.get("facebook_url") || ""));
  const tiktok_url = normalizeUrl(String(formData.get("tiktok_url") || ""));
  const whatsapp_public = String(formData.get("whatsapp_public") || "").trim() || null;

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
  if (RESERVED_SLUGS.has(slug)) {
    redirect("/dashboard?tab=perfil&perfil_error=slug_reservado");
  }
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
      country,
      state,
      gender,
      birth_date,
      profession,
      professional_license_number,
      university,
      graduation_year,
      therapy_types,
      languages,
      client_niches,
      price_min,
      price_max,
      is_online_available,
      is_in_person_available,
      address,
      is_published,
      instagram_url,
      facebook_url,
      tiktok_url,
      whatsapp_public,
      ...(photo_url ? { photo_url } : {}),
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

  // Catálogo de servicios con precio propio (migración 0031): catálogo fijo,
  // el terapeuta solo marca cuáles ofrece y les pone precio + duración. Cada
  // servicio marcado trae sus propios campos price_<id>/duration_<id> (ver
  // TherapistServicesFields) — a diferencia de posgrado/formación continua,
  // aquí no hace falta el patrón de arreglos paralelos porque el catálogo es
  // fijo y acotado, así que se puede indexar por id directo. Se descarta
  // cualquier servicio marcado sin precio válido (>0) o con una duración
  // fuera de las 3 permitidas — defensivo, la UI ya no debería dejar pasar
  // eso, pero el price check de la tabla (`price > 0`) tiraría la insert
  // completa si se colara uno malo.
  const serviceIds = formData.getAll("service_ids").map(String);
  const serviceRows = serviceIds
    .map((service_id) => {
      const price = Number(formData.get(`price_${service_id}`));
      const duration_min = Number(formData.get(`duration_${service_id}`));
      return { therapist_id: user.id, service_id, price, duration_min };
    })
    .filter((r) => r.price > 0 && [30, 45, 60].includes(r.duration_min));

  await supabase.from("therapist_services").delete().eq("therapist_id", user.id);
  if (serviceRows.length) {
    await supabase.from("therapist_services").insert(serviceRows);
  }

  // Formación de posgrado y formación continua: filas repetibles, todas las
  // del mismo campo comparten `name` en el form (ver PostgraduateEducation-
  // Fields / ContinuingEducationFields), así que getAll() regresa arreglos
  // paralelos en el mismo orden — se descarta cualquier fila que haya
  // quedado totalmente vacía (por ejemplo, un renglón que se agregó y nunca
  // se llenó).
  const pgDegreeTypes = formData.getAll("pg_degree_type").map(String);
  const pgProgramNames = formData.getAll("pg_program_name").map(String);
  const pgInstitutions = formData.getAll("pg_institution").map(String);
  const pgYears = formData.getAll("pg_completion_year").map(String);
  const pgLicenses = formData.getAll("pg_license_number").map(String);

  const postgraduateRows = pgDegreeTypes
    .map((degree_type, i) => ({
      therapist_id: user.id,
      degree_type: degree_type.trim(),
      program_name: (pgProgramNames[i] ?? "").trim(),
      institution: (pgInstitutions[i] ?? "").trim(),
      completion_year: pgYears[i] ? Number(pgYears[i]) : null,
      license_number: (pgLicenses[i] ?? "").trim() || null,
    }))
    .filter((r) => r.degree_type || r.program_name || r.institution);

  await supabase.from("therapist_postgraduate_studies").delete().eq("therapist_id", user.id);
  if (postgraduateRows.length) {
    await supabase.from("therapist_postgraduate_studies").insert(postgraduateRows);
  }

  const ceTypes = formData.getAll("ce_education_type").map(String);
  const ceNames = formData.getAll("ce_name").map(String);
  const ceInstitutions = formData.getAll("ce_institution").map(String);
  const ceYears = formData.getAll("ce_year").map(String);
  const ceHours = formData.getAll("ce_hours").map(String);

  const continuingEdRows = ceTypes
    .map((education_type, i) => ({
      therapist_id: user.id,
      education_type: education_type.trim(),
      name: (ceNames[i] ?? "").trim(),
      institution: (ceInstitutions[i] ?? "").trim() || null,
      year: ceYears[i] ? Number(ceYears[i]) : null,
      hours: ceHours[i] ? Number(ceHours[i]) : null,
    }))
    .filter((r) => r.education_type || r.name);

  await supabase.from("therapist_continuing_education").delete().eq("therapist_id", user.id);
  if (continuingEdRows.length) {
    await supabase.from("therapist_continuing_education").insert(continuingEdRows);
  }

  revalidatePath("/dashboard");
  revalidatePath("/buscar");
  revalidatePath("/test");
  revalidatePath(`/${slug}`);

  if (blockedBySubscription) {
    redirect("/dashboard?tab=perfil&perfil_error=suscripcion");
  }
  redirect("/dashboard?tab=perfil&perfil_guardado=1");
}

const MAX_DOC_BYTES = 8 * 1024 * 1024; // cédulas escaneadas pesan más que una foto de perfil
const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// Documentos de verificación (cédula, identificación oficial, título
// opcional) — bucket privado "therapist-documents" (ver migración 0030).
// Acción separada de saveTherapistProfile a propósito: es un envío formal
// para revisión, no un dato de perfil cualquiera, y una vez que el equipo
// de Lemy aprueba la verificación esta sección se bloquea por completo (ver
// dashboard/perfil/page.tsx) para que no puedan reemplazar documentos ya
// aprobados sin pasar de nuevo por revisión.
export async function uploadVerificationDocuments(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: therapist } = await supabase
    .from("therapists")
    .select("verification_status")
    .eq("id", user.id)
    .maybeSingle();

  // Defensivo: la UI ya oculta este formulario si está verificado, pero por
  // si acaso alguien lo manda igual (formulario viejo en caché, etc.).
  if (therapist?.verification_status === "verified") {
    redirect("/dashboard?tab=perfil&perfil_error=verificado_bloqueado");
  }

  const cedula = formData.get("doc_cedula") as File | null;
  const identificacion = formData.get("doc_identificacion") as File | null;
  const titulo = formData.get("doc_titulo") as File | null;

  if (!cedula || cedula.size === 0) redirect("/dashboard?tab=perfil&perfil_error=documento_faltante");
  if (!identificacion || identificacion.size === 0) {
    redirect("/dashboard?tab=perfil&perfil_error=documento_faltante");
  }

  const filesToValidate = [cedula, identificacion, ...(titulo && titulo.size > 0 ? [titulo] : [])];
  for (const f of filesToValidate) {
    if (!ALLOWED_DOC_TYPES.includes(f.type)) redirect("/dashboard?tab=perfil&perfil_error=documento_invalido");
    if (f.size > MAX_DOC_BYTES) redirect("/dashboard?tab=perfil&perfil_error=documento_grande");
  }

  async function uploadDoc(file: File, tipo: string): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${user!.id}/${tipo}.${ext}`;
    const { error } = await supabase.storage
      .from("therapist-documents")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      console.error(`Error subiendo documento de verificación (${tipo}):`, error);
      redirect("/dashboard?tab=perfil&perfil_error=documento");
    }
    return path;
  }

  const cedulaPath = await uploadDoc(cedula, "cedula");
  const idPath = await uploadDoc(identificacion, "identificacion");
  const tituloPath = titulo && titulo.size > 0 ? await uploadDoc(titulo, "titulo") : null;

  // Reemplaza los 3 tipos fijos — borra lo anterior de este terapeuta y
  // vuelve a insertar solo lo que sí se subió en este envío.
  await supabase
    .from("therapist_credentials")
    .delete()
    .eq("therapist_id", user.id)
    .in("tipo", ["cedula", "identificacion", "titulo"]);

  const rows = [
    { therapist_id: user.id, tipo: "cedula", documento_url: cedulaPath },
    { therapist_id: user.id, tipo: "identificacion", documento_url: idPath },
    ...(tituloPath ? [{ therapist_id: user.id, tipo: "titulo", documento_url: tituloPath }] : []),
  ];
  await supabase.from("therapist_credentials").insert(rows);

  revalidatePath("/dashboard");
  redirect("/dashboard?tab=perfil&perfil_documentos_guardados=1");
}

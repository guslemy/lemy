import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { ProfileForm } from "@/components/therapist-profile-form";
import { ModalityFields } from "@/components/therapist-modality-fields";
import { PhotoUploadField } from "@/components/photo-upload-field";
import { GoogleCalendarConnectButton } from "@/components/google-calendar-connect-button";
import { PostgraduateEducationFields } from "@/components/postgraduate-education-fields";
import { ContinuingEducationFields } from "@/components/continuing-education-fields";
import { ensureTherapistShell } from "@/lib/supabase/ensure-therapist";
import {
  GENEROS,
  PROFESIONES,
  POBLACION_ATENDIDA,
  TIPOS_DE_TERAPIA,
  IDIOMAS_FIJOS,
} from "@/lib/perfil-catalogos";
import { saveTherapistProfile } from "../actions";

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Formulario de edición de perfil. Server component puro: el botón
// "Guardar cambios" dispara el server action directo, sin JS de cliente.
export default async function EditarPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; google_reconectado?: string }>;
}) {
  const { error, google_reconectado } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "therapist") redirect("/dashboard");

  await ensureTherapistShell(supabase, user);

  const [
    { data: therapist },
    { data: specialties },
    { data: approaches },
    { data: mySpecialties },
    { data: myApproaches },
    { data: postgraduateStudies },
    { data: continuingEducation },
  ] = await Promise.all([
    supabase
      .from("therapists")
      .select(
        "display_name, slug, tagline, bio, city, zona, country, state, gender, birth_date, profession, professional_license_number, university, graduation_year, therapy_types, languages, client_niches, price_min, price_max, is_online_available, is_in_person_available, address, is_published, photo_url, instagram_url, facebook_url, tiktok_url, whatsapp_public, google_calendar_connected"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("specialties").select("id, nombre_coloquial").order("nombre_coloquial"),
    supabase.from("therapeutic_approaches").select("id, nombre_tecnico").order("nombre_tecnico"),
    supabase.from("therapist_specialties").select("specialty_id").eq("therapist_id", user.id),
    supabase.from("therapist_approaches").select("approach_id").eq("therapist_id", user.id),
    supabase
      .from("therapist_postgraduate_studies")
      .select("degree_type, program_name, institution, completion_year, license_number")
      .eq("therapist_id", user.id)
      .order("created_at"),
    supabase
      .from("therapist_continuing_education")
      .select("education_type, name, institution, year, hours")
      .eq("therapist_id", user.id)
      .order("created_at"),
  ]);

  const selectedSpecialtyIds = new Set((mySpecialties ?? []).map((s) => s.specialty_id));
  const selectedApproachIds = new Set((myApproaches ?? []).map((a) => a.approach_id));

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[760px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Tu perfil</p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Cuéntanos quién eres
          </h1>
          <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
            Esto es lo que va a ver quien te busque. Puedes guardar como borrador y publicarlo cuando
            estés list@.
          </p>

          {error === "suscripcion" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Guardamos tus cambios, pero no pudimos publicar tu perfil: tu prueba gratis terminó y no
              tienes una suscripción activa.{" "}
              <Link href="/dashboard/suscripcion" className="underline">
                Suscríbete aquí
              </Link>
              .
            </p>
          )}
          {error === "foto" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              No pudimos subir esa imagen. Revisa que sea un archivo de imagen válido.
            </p>
          )}
          {error === "foto_grande" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Esa imagen pesa demasiado (máximo 5 MB).
            </p>
          )}
          {error === "slug_reservado" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Esa URL ya la usa una página del sitio — elige otra para tu perfil.
            </p>
          )}

          {google_reconectado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Listo, tu Google Calendar quedó reconectado.
            </p>
          )}

          <div className="signature-corner mt-6 rounded-[28px] border border-line bg-card p-7">
            <h2 className="mb-3 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
              Google Calendar
            </h2>
            {therapist?.google_calendar_connected ? (
              <p className="text-[0.88rem] text-forest">✓ Conectado — tus citas confirmadas crean el evento y el Meet automáticamente.</p>
            ) : (
              <>
                <p className="mb-4 text-[0.88rem] text-[#42504A]">
                  No está conectado (o dejó de funcionar). Mientras tanto, tus citas se confirman igual
                  con una sala de videollamada de respaldo — pero conectarlo te crea el evento real en tu
                  calendario y el Meet automáticamente.
                </p>
                <GoogleCalendarConnectButton label="Conectar Google Calendar" />
              </>
            )}
          </div>

          <ProfileForm action={saveTherapistProfile}>
            <div className="signature-corner rounded-[28px] border border-line bg-card p-7">
              <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                Tu foto
              </h2>
              <div className="flex flex-wrap items-center gap-5">
                {therapist?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={therapist.photo_url}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose to-rose-deep font-display text-xl font-semibold text-white">
                    {initialsFrom(therapist?.display_name || "Tu Nombre")}
                  </div>
                )}
                <div className="min-w-[240px] flex-1">
                  <PhotoUploadField />
                </div>
              </div>
              <p className="mt-3 text-[0.78rem] text-[#7C877F]">
                Se guarda junto con el resto de tu perfil al dar clic en &ldquo;Guardar cambios&rdquo;.
              </p>
            </div>

            <div className="signature-corner rounded-[28px] border border-line bg-card p-7">
              <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                Lo básico
              </h2>

              <div className="space-y-4">
                <Field label="Nombre para mostrar">
                  <input
                    name="display_name"
                    defaultValue={therapist?.display_name ?? ""}
                    required
                    className="input-lemy"
                  />
                </Field>

                <Field label="URL de tu perfil" hint="lemy.mx/tu-slug">
                  <input name="slug" defaultValue={therapist?.slug ?? ""} className="input-lemy" />
                </Field>

                <Field label="Frase corta" hint="Ej. Ansiedad y estrés, en línea">
                  <input name="tagline" defaultValue={therapist?.tagline ?? ""} className="input-lemy" />
                </Field>

                <Field label="Sobre ti">
                  <textarea name="bio" defaultValue={therapist?.bio ?? ""} rows={5} className="input-lemy" />
                </Field>

                <Field
                  label="WhatsApp"
                  hint="Para mandarte avisos de prueba, renovación y citas — 10 dígitos, ej. 9511234567"
                >
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={profile?.phone ?? ""}
                    className="input-lemy"
                  />
                </Field>
              </div>
            </div>

            <div className="signature-corner rounded-[28px] border border-line bg-card p-7">
              <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                Datos personales
              </h2>
              <p className="mb-4 text-[0.85rem] text-[#7C877F]">
                La fecha de nacimiento es solo para validación interna — nunca se muestra en tu perfil
                público.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Género">
                  <select
                    name="gender"
                    defaultValue={therapist?.gender ?? ""}
                    className="input-lemy"
                  >
                    <option value="">Selecciona…</option>
                    {GENEROS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fecha de nacimiento">
                  <input
                    type="date"
                    name="birth_date"
                    defaultValue={therapist?.birth_date ?? ""}
                    className="input-lemy"
                  />
                </Field>
              </div>
            </div>

            <div className="signature-corner rounded-[28px] border border-line bg-card p-7">
              <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                Información profesional
              </h2>
              <p className="mb-4 text-[0.85rem] text-[#7C877F]">
                El número de cédula que escribes aquí es solo informativo por ahora — más adelante,
                cuando subamos la verificación de documentos, lo confirmaremos contra tu cédula real.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Profesión">
                  <select
                    name="profession"
                    defaultValue={therapist?.profession ?? ""}
                    className="input-lemy"
                  >
                    <option value="">Selecciona…</option>
                    {PROFESIONES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Número de cédula profesional">
                  <input
                    name="professional_license_number"
                    defaultValue={therapist?.professional_license_number ?? ""}
                    className="input-lemy"
                  />
                </Field>
                <Field label="Universidad">
                  <input
                    name="university"
                    defaultValue={therapist?.university ?? ""}
                    className="input-lemy"
                  />
                </Field>
                <Field label="Año de egreso">
                  <input
                    type="number"
                    name="graduation_year"
                    defaultValue={therapist?.graduation_year ?? ""}
                    className="input-lemy"
                  />
                </Field>
              </div>
            </div>

            <div className="signature-corner rounded-[28px] border border-line bg-card p-7">
              <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                Formación de posgrado
              </h2>
              <p className="mb-4 text-[0.85rem] text-[#7C877F]">
                Especialidades, maestrías, doctorados, diplomados o certificaciones — se muestran en tu
                perfil público. Puedes agregar los que quieras.
              </p>
              <PostgraduateEducationFields
                initialRows={(postgraduateStudies ?? []).map((r) => ({
                  degree_type: r.degree_type,
                  program_name: r.program_name,
                  institution: r.institution,
                  completion_year: r.completion_year,
                  license_number: r.license_number,
                }))}
              />
            </div>

            <div className="signature-corner rounded-[28px] border border-line bg-card p-7">
              <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                Formación continua
              </h2>
              <p className="mb-4 text-[0.85rem] text-[#7C877F]">
                Cursos, talleres, seminarios, congresos o supervisión clínica — también se muestran en tu
                perfil público. Por ahora no piden documento comprobatorio; eso llega junto con la
                verificación de documentos.
              </p>
              <ContinuingEducationFields
                initialRows={(continuingEducation ?? []).map((r) => ({
                  education_type: r.education_type,
                  name: r.name,
                  institution: r.institution,
                  year: r.year,
                  hours: r.hours,
                }))}
              />
            </div>

            <div className="signature-corner rounded-[28px] border border-line bg-card p-7">
              <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                Redes sociales
              </h2>
              <p className="mb-4 text-[0.85rem] text-[#7C877F]">
                Aparecen como íconos justo debajo de tu foto en tu perfil público — ideal para poner tu
                link de Lemy en tu bio de Instagram o TikTok. Deja en blanco lo que no uses.
              </p>
              <div className="space-y-4">
                <Field
                  label="WhatsApp para contactarte"
                  hint="El botón de 'Contactar por WhatsApp' de tu perfil público usa este número — puede ser el mismo de arriba o uno distinto de tu consultorio"
                >
                  <input
                    name="whatsapp_public"
                    type="tel"
                    defaultValue={therapist?.whatsapp_public ?? profile?.phone ?? ""}
                    placeholder="9511234567"
                    className="input-lemy"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Instagram">
                    <input
                      name="instagram_url"
                      defaultValue={therapist?.instagram_url ?? ""}
                      placeholder="instagram.com/tu_usuario"
                      className="input-lemy"
                    />
                  </Field>
                  <Field label="Facebook">
                    <input
                      name="facebook_url"
                      defaultValue={therapist?.facebook_url ?? ""}
                      placeholder="facebook.com/tu_pagina"
                      className="input-lemy"
                    />
                  </Field>
                  <Field label="TikTok">
                    <input
                      name="tiktok_url"
                      defaultValue={therapist?.tiktok_url ?? ""}
                      placeholder="tiktok.com/@tu_usuario"
                      className="input-lemy"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="signature-corner rounded-[28px] border border-line bg-card p-7">
              <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                Dónde y cómo atiendes
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="País">
                  <input name="country" defaultValue={therapist?.country ?? "México"} className="input-lemy" />
                </Field>
                <Field label="Estado">
                  <input name="state" defaultValue={therapist?.state ?? ""} className="input-lemy" />
                </Field>
                <Field label="Ciudad">
                  <input name="city" defaultValue={therapist?.city ?? "Oaxaca"} className="input-lemy" />
                </Field>
                <Field label="Zona (opcional)">
                  <input name="zona" defaultValue={therapist?.zona ?? ""} className="input-lemy" />
                </Field>
                <Field label="Tarifa mínima (MXN)">
                  <input
                    type="number"
                    name="price_min"
                    defaultValue={therapist?.price_min ?? ""}
                    className="input-lemy"
                  />
                </Field>
                <Field label="Tarifa máxima (MXN)">
                  <input
                    type="number"
                    name="price_max"
                    defaultValue={therapist?.price_max ?? ""}
                    className="input-lemy"
                  />
                </Field>
              </div>

              <div className="mt-5">
                <span className="mb-2 block text-[0.85rem] font-medium text-forest">Idiomas</span>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {IDIOMAS_FIJOS.map((idioma) => (
                    <label key={idioma} className="flex items-center gap-2 text-[0.85rem] text-[#3E4B44]">
                      <input
                        type="checkbox"
                        name="languages"
                        value={idioma}
                        defaultChecked={(therapist?.languages ?? ["Español"]).includes(idioma)}
                        className="h-4 w-4 accent-forest"
                      />
                      {idioma}
                    </label>
                  ))}
                </div>
                <input
                  name="languages_otro"
                  defaultValue={(therapist?.languages ?? [])
                    .filter((l: string) => !(IDIOMAS_FIJOS as readonly string[]).includes(l))
                    .join(", ")}
                  placeholder="Otro idioma (separados por coma)"
                  className="input-lemy mt-2.5"
                />
              </div>

              <div className="mt-5">
                <span className="mb-2 block text-[0.85rem] font-medium text-forest">
                  Población que atiendes
                </span>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {POBLACION_ATENDIDA.map((p) => (
                    <label key={p} className="flex items-center gap-2.5 text-[0.85rem] text-[#3E4B44]">
                      <input
                        type="checkbox"
                        name="client_niches"
                        value={p}
                        defaultChecked={(therapist?.client_niches ?? []).includes(p)}
                        className="h-4 w-4 accent-forest"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <span className="mb-2 block text-[0.85rem] font-medium text-forest">Tipo de terapia</span>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {TIPOS_DE_TERAPIA.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-[0.85rem] text-[#3E4B44]">
                      <input
                        type="checkbox"
                        name="therapy_types"
                        value={t}
                        defaultChecked={(therapist?.therapy_types ?? []).includes(t)}
                        className="h-4 w-4 accent-forest"
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              <ModalityFields
                initialOnline={therapist?.is_online_available ?? true}
                initialInPerson={therapist?.is_in_person_available ?? false}
                initialAddress={therapist?.address ?? ""}
              />
            </div>

            <div className="signature-corner rounded-[28px] border border-line bg-card p-7">
              <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                En qué trabajas
              </h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(specialties ?? []).map((s) => (
                  <label key={s.id} className="flex items-center gap-2.5 text-[0.88rem] text-[#3E4B44]">
                    <input
                      type="checkbox"
                      name="specialties"
                      value={s.id}
                      defaultChecked={selectedSpecialtyIds.has(s.id)}
                      className="h-4 w-4 accent-forest"
                    />
                    {s.nombre_coloquial}
                  </label>
                ))}
              </div>
            </div>

            <div className="signature-corner rounded-[28px] border border-line bg-card p-7">
              <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                Tu enfoque
              </h2>
              <p className="mb-4 text-[0.85rem] text-[#7C877F]">
                En tu perfil público esto se muestra con una explicación en lenguaje llano para el
                paciente — aquí solo necesitas marcar el tuyo.
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(approaches ?? []).map((a) => (
                  <label key={a.id} className="flex items-center gap-2.5 text-[0.88rem] text-[#3E4B44]">
                    <input
                      type="checkbox"
                      name="approaches"
                      value={a.id}
                      defaultChecked={selectedApproachIds.has(a.id)}
                      className="h-4 w-4 accent-forest"
                    />
                    {a.nombre_tecnico}
                  </label>
                ))}
              </div>
            </div>

            <div className="signature-corner rounded-[28px] border border-line bg-forest p-7">
              <label className="flex items-center gap-3 text-[0.95rem] font-medium text-sage-white">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={therapist?.is_published ?? false}
                  className="h-4 w-4 accent-rose"
                />
                Publicar mi perfil (visible para cualquiera en el buscador)
              </label>
            </div>

            <Button type="submit" variant="primary" className="w-full sm:w-auto">
              Guardar cambios
            </Button>
          </ProfileForm>

          <BackToDashboard />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.78rem] text-[#7C877F]">{hint}</span>}
    </label>
  );
}

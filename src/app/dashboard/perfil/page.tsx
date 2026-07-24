import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { ProfileForm } from "@/components/therapist-profile-form";
import { ModalityFields } from "@/components/therapist-modality-fields";
import { PhotoUploadField } from "@/components/photo-upload-field";
import { ensureTherapistShell } from "@/lib/supabase/ensure-therapist";
import { saveTherapistProfile, uploadTherapistPhoto } from "../actions";

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
  searchParams: Promise<{ error?: string; foto_guardada?: string }>;
}) {
  const { error, foto_guardada } = await searchParams;
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
  ] = await Promise.all([
    supabase
      .from("therapists")
      .select(
        "display_name, slug, tagline, bio, city, zona, languages, client_niches, price_min, price_max, is_online_available, is_in_person_available, address, is_published, photo_url"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("specialties").select("id, nombre_coloquial").order("nombre_coloquial"),
    supabase.from("therapeutic_approaches").select("id, nombre_tecnico").order("nombre_tecnico"),
    supabase.from("therapist_specialties").select("specialty_id").eq("therapist_id", user.id),
    supabase.from("therapist_approaches").select("approach_id").eq("therapist_id", user.id),
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
          {foto_guardada === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Listo, actualizamos tu foto.
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

          <div className="signature-corner mt-9 rounded-[28px] border border-line bg-card p-7">
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
              <form action={uploadTherapistPhoto} className="flex flex-1 flex-wrap items-center gap-3">
                <div className="min-w-[240px] flex-1">
                  <PhotoUploadField />
                </div>
                <SubmitButton pendingText="Subiendo…" variant="ghost">
                  Subir foto
                </SubmitButton>
              </form>
            </div>
          </div>

          <ProfileForm action={saveTherapistProfile}>
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

                <Field label="URL de tu perfil" hint="lemy.mx/terapeuta/tu-slug">
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
                Dónde y cómo atiendes
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Ciudad">
                  <input name="city" defaultValue={therapist?.city ?? "Oaxaca"} className="input-lemy" />
                </Field>
                <Field label="Zona (opcional)">
                  <input name="zona" defaultValue={therapist?.zona ?? ""} className="input-lemy" />
                </Field>
                <Field label="Idiomas" hint="Separados por coma">
                  <input
                    name="languages"
                    defaultValue={(therapist?.languages ?? ["Español"]).join(", ")}
                    className="input-lemy"
                  />
                </Field>
                <Field label="A quién atiendes" hint="Ej. adultos, parejas, adolescentes">
                  <input
                    name="client_niches"
                    defaultValue={(therapist?.client_niches ?? []).join(", ")}
                    className="input-lemy"
                  />
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

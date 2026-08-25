import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { StarRatingInput } from "@/components/star-rating-input";
import { submitReview, signOutAndRetry } from "./actions";

// Página a la que llega el paciente desde el correo "¿Cómo te fue con
// {terapeuta}?" (ver notifications/engine.ts, disparo review_request).
// Requiere sesión — si el paciente no está logueado, /login lo regresa
// aquí después de entrar (mismo patrón que el resto del sitio).
export default async function ResenaPage({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { appointmentId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/resena/${appointmentId}`);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, therapist_id, patient_id, scheduled_at, status")
    .eq("id", appointmentId)
    .eq("patient_id", user.id)
    .maybeSingle();

  // No es necesariamente que la cita no exista — lo más común es que el
  // paciente esté logueado con una cuenta distinta a la que usó para
  // agendar (ej. abrió el correo en otro navegador donde ya tenía sesión
  // con otro correo). Antes esto tiraba un 404 genérico y confuso; ahora
  // se explica qué pasó y se ofrece cambiar de cuenta ahí mismo.
  if (!appointment) {
    return (
      <>
        <SiteHeader />
        <main className="px-6 py-16 sm:px-8 md:py-20">
          <div className="mx-auto max-w-[560px]">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
              Tu opinión
            </p>
            <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
              Esta cuenta no es la que agendó la sesión
            </h1>
            <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
              Para dejar tu reseña, entra con el correo que usaste para agendar tu sesión con este
              terapeuta.
            </p>
            <form action={signOutAndRetry.bind(null, appointmentId)} className="mt-7">
              <Button type="submit" variant="primary">
                Cerrar sesión y entrar con la otra cuenta
              </Button>
            </form>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const { data: therapist } = await supabase
    .from("therapists")
    .select("display_name, slug")
    .eq("id", appointment.therapist_id)
    .maybeSingle();

  if (!therapist) notFound();

  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id, rating, comment")
    .eq("appointment_id", appointment.id)
    .maybeSingle();

  const therapistFirstName = therapist.display_name.split(" ")[0];
  const alreadyReviewed = Boolean(existingReview) || ok === "1";
  const cancelled = appointment.status === "cancelled";

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[560px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Tu opinión
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            ¿Cómo te fue con {therapistFirstName}?
          </h1>

          {cancelled ? (
            <p className="mt-6 rounded-2xl border border-line bg-card p-6 text-[0.95rem] text-[#3E4B44]">
              Esta cita fue cancelada, así que no hay nada que calificar todavía. En cuanto tengas
              una sesión con {therapistFirstName}, te avisamos para que nos cuentes cómo te fue.
            </p>
          ) : alreadyReviewed ? (
            <div className="mt-6 rounded-2xl border border-line bg-forest/[0.06] p-6">
              <p className="text-[0.95rem] text-forest">
                Gracias por tomarte el tiempo — tu reseña ya quedó registrada.
              </p>
              {existingReview?.comment && (
                <p className="mt-3 text-[0.9rem] text-[#3E4B44]">&quot;{existingReview.comment}&quot;</p>
              )}
            </div>
          ) : (
            <>
              <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
                Tu opinión ayuda a que otras personas que están buscando a alguien como{" "}
                {therapistFirstName} se animen a dar el paso. Toma menos de un minuto.
              </p>

              {error === "calificacion" && (
                <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-4 py-2.5 text-[0.85rem] text-rose-deep">
                  Elige una calificación de 1 a 5 estrellas.
                </p>
              )}
              {error === "guardado" && (
                <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-4 py-2.5 text-[0.85rem] text-rose-deep">
                  Algo no salió bien al guardar, intenta de nuevo.
                </p>
              )}

              <form action={submitReview.bind(null, appointment.id)} className="mt-8">
                <StarRatingInput name="rating" />
                <textarea
                  name="comment"
                  rows={4}
                  maxLength={800}
                  placeholder={`¿Qué destacarías de tu experiencia con ${therapistFirstName}?`}
                  className="mt-5 w-full rounded-2xl border border-line bg-card p-4 text-[0.9rem] text-forest placeholder:text-[#8B978F] focus:outline-none focus:ring-2 focus:ring-forest/30"
                />
                <Button type="submit" variant="primary" className="mt-5">
                  Enviar mi reseña
                </Button>
              </form>
            </>
          )}

          <div className="mt-9">
            <Button href="/dashboard" variant="ghost">
              Ir a mi panel
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

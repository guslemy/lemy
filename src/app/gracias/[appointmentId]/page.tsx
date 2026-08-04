import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

// Página genérica de "gracias" para cualquier solicitud de cita — una sola
// plantilla dinámica (como /terapeuta/[slug]) que arma su contenido con los
// datos reales de la cita recién creada, en vez de una página por
// terapeuta. Reemplaza el banner inline "solicitado=1" que vivía dentro de
// /terapeuta/[slug]#agenda: aquí hay espacio para explicar con calma los
// siguientes pasos, distintos según la modalidad.

const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTH_LABELS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const OAXACA_UTC_OFFSET_MIN = 6 * 60;

function formatOaxaca(iso: string) {
  const utcMs = new Date(iso).getTime() - OAXACA_UTC_OFFSET_MIN * 60 * 1000;
  const local = new Date(utcMs);
  const weekday = WEEKDAY_LABELS[local.getUTCDay()];
  const d = local.getUTCDate();
  const month = MONTH_LABELS[local.getUTCMonth()];
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  return { dateLabel: `${weekday} ${d} de ${month}`, timeLabel: `${hh}:${mm}` };
}

export default async function GraciasPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, therapist_id, patient_id, scheduled_at, modality")
    .eq("id", appointmentId)
    .eq("patient_id", user.id)
    .maybeSingle();

  if (!appointment) notFound();

  const { data: therapist } = await supabase
    .from("therapists")
    .select("display_name, slug, address")
    .eq("id", appointment.therapist_id)
    .maybeSingle();

  if (!therapist) notFound();

  const modality: "online" | "presencial" = appointment.modality === "presencial" ? "presencial" : "online";
  const { dateLabel, timeLabel } = formatOaxaca(appointment.scheduled_at as string);
  const therapistFirstName = therapist.display_name.split(" ")[0];

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[640px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Solicitud enviada
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            ¡Listo! Tu solicitud con {therapistFirstName} quedó registrada
          </h1>
          <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
            En cuanto {therapistFirstName} la confirme, te avisamos por correo.
          </p>

          <div className="signature-corner mt-8 rounded-[28px] border border-line bg-card p-7">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">
              Tu cita
            </p>
            <p className="mt-2 font-display text-[1.15rem] text-forest">{therapist.display_name}</p>
            <p className="mt-1 text-[0.95rem] text-[#3E4B44]">
              {dateLabel} · {timeLabel} hrs
            </p>
            <span className="mt-2 inline-block rounded-full bg-forest/[0.08] px-2.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.05em] text-forest">
              {modality === "online" ? "En línea" : "Presencial"}
            </span>
            {modality === "presencial" && therapist.address && (
              <p className="mt-3 text-[0.85rem] text-[#3E4B44]">
                <span className="font-medium">Dirección de referencia:</span> {therapist.address}
                <br />
                <span className="text-[0.8rem] text-[#8B978F]">
                  Confirmamos esta dirección junto con el horario cuando {therapistFirstName} acepte tu
                  solicitud.
                </span>
              </p>
            )}
          </div>

          <div className="mt-9">
            <h2 className="mb-3 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-rose-deep">
              Qué sigue
            </h2>
            <ul className="space-y-3">
              <li className="flex gap-3 rounded-2xl border border-line bg-card p-4 text-[0.9rem] text-[#3E4B44]">
                <span className="text-forest">1.</span>
                <span>
                  Espera la confirmación de {therapistFirstName} — te llega por correo (y WhatsApp,
                  próximamente) en cuanto acepte tu solicitud.
                </span>
              </li>
              <li className="flex gap-3 rounded-2xl border border-line bg-card p-4 text-[0.9rem] text-[#3E4B44]">
                <span className="text-forest">2.</span>
                <span>Aparta el espacio en tu calendario, aunque sea de forma informal, para que no se te empalme con otra cosa.</span>
              </li>
              {modality === "online" ? (
                <li className="flex gap-3 rounded-2xl border border-line bg-card p-4 text-[0.9rem] text-[#3E4B44]">
                  <span className="text-forest">3.</span>
                  <span>
                    Busca un espacio tranquilo con buena conexión, ten agua a la mano, y entra a la
                    videollamada unos minutos antes de la hora.
                  </span>
                </li>
              ) : (
                <li className="flex gap-3 rounded-2xl border border-line bg-card p-4 text-[0.9rem] text-[#3E4B44]">
                  <span className="text-forest">3.</span>
                  <span>
                    Revisa cómo llegar con anticipación y calcula tu tiempo de traslado — mejor llegar
                    con unos minutos de sobra.
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button href="/dashboard/mis-citas" variant="primary">
              Ir a mis citas
            </Button>
            <Button href={`/${therapist.slug}`} variant="ghost">
              Ver perfil de {therapistFirstName}
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

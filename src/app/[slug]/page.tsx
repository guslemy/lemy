import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/pill";
import { QuizFloatingTab } from "@/components/quiz-floating-tab";
import { InstagramIcon, FacebookIcon, TikTokIcon, WhatsAppIcon } from "@/components/social-icons";
import { ShareProfileButton } from "@/components/share-profile-button";
import { getAvailableSlots } from "@/lib/availability";
import { BookingCalendar, type DaySlots } from "./booking-calendar";
import { requestAppointment } from "./actions";

// Perfil público de un terapeuta, en la raíz del dominio (lemy.mx/[slug])
// para que sea un link corto y "de bio" — tipo linktr.ee/usuario — en vez
// de lemy.mx/terapeuta/usuario. Antes vivía en /terapeuta/[slug]; esa ruta
// ahora es un redirect permanente hacia acá (ver next.config.ts). Solo
// visible si is_published = true (lo aplica la RLS "therapists_public_read"
// además del filtro explícito aquí).
// Nota: no leemos therapist_credentials aquí — su RLS es owner-only, un
// visitante anónimo nunca vería esas filas de todos modos. El badge de
// "verificado" sale directo del campo verification_status en therapists.
//
// Al vivir en la raíz, este slug compite en teoría con cualquier otra ruta
// de nivel superior (/buscar, /dashboard, etc.) — pero Next.js siempre
// prioriza una ruta explícita sobre este catch-all, así que el sitio nunca
// se rompe. Lo que sí se bloquea aparte es que un terapeuta pueda GUARDAR
// uno de esos nombres como su propio slug (ver reserved-slugs.ts) — si no,
// su perfil quedaría inalcanzable sin ningún aviso.

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ solicitado?: string; ocupado?: string; error?: string; propio?: string }>;
};

type CatalogItem = {
  slug: string;
  nombre_tecnico?: string;
  nombre_coloquial: string;
  descripcion_coloquial: string | null;
};

type TherapistDetail = {
  id: string;
  slug: string;
  display_name: string;
  photo_url: string | null;
  city: string | null;
  zona: string | null;
  tagline: string | null;
  bio: string | null;
  languages: string[] | null;
  client_niches: string[] | null;
  therapy_types: string[] | null;
  profession: string | null;
  is_online_available: boolean;
  is_in_person_available: boolean;
  price_min: number | null;
  price_max: number | null;
  verification_status: string;
  created_at: string;
  stripe_connect_charges_enabled: boolean;
  accepts_card_payment: boolean;
  accepts_cash_payment: boolean;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  whatsapp_public: string | null;
  therapist_specialties: { specialty: CatalogItem | null }[] | null;
  therapist_approaches: { approach: CatalogItem | null }[] | null;
};

async function getTherapist(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("therapists")
    .select(
      `id, slug, display_name, photo_url, city, zona, tagline, bio, languages, client_niches,
       therapy_types, profession,
       is_online_available, is_in_person_available, price_min, price_max, verification_status, created_at,
       stripe_connect_charges_enabled, accepts_card_payment, accepts_cash_payment,
       instagram_url, facebook_url, tiktok_url, whatsapp_public,
       therapist_specialties ( specialty:specialties ( slug, nombre_coloquial, descripcion_coloquial ) ),
       therapist_approaches ( approach:therapeutic_approaches ( slug, nombre_tecnico, nombre_coloquial, descripcion_coloquial ) )`
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return data as unknown as TherapistDetail | null;
}

// wa.me necesita el número en formato internacional sin signos — asumimos
// México (52) para los de 10 dígitos, igual que normalizePhone en
// notifications/engine.ts (pero sin importar ese módulo aquí, que además
// trae de arrastre clientes de Resend/WhatsApp server-only).
function whatsappLink(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const withCountry = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function priceLabel(min: number | null, max: number | null) {
  if (min) return `desde $${Math.round(min)} MXN / sesión`;
  if (max) return `hasta $${Math.round(max)} MXN / sesión`;
  return "Tarifa a consultar";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const therapist = await getTherapist(slug);
  if (!therapist) return { title: "Terapeuta no encontrado" };
  const description = therapist.tagline ?? "Perfil de terapeuta verificado en Lemy.";
  return {
    title: therapist.display_name,
    description,
    openGraph: { title: therapist.display_name, description },
  };
}

const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function formatSlotDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Fecha "de calendario" sin componente de hora, para no arrastrar
  // corrimientos de zona horaria al mostrarla.
  const weekday = WEEKDAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d}/${m}`;
}

export default async function TherapistProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { solicitado, ocupado, error, propio } = await searchParams;
  const therapist = await getTherapist(slug);
  if (!therapist) notFound();

  const supabase = await createClient();
  const slots = await getAvailableSlots(supabase, therapist.id);
  const slotsByDate = new Map<string, typeof slots>();
  for (const slot of slots) {
    const list = slotsByDate.get(slot.date) ?? [];
    list.push(slot);
    slotsByDate.set(slot.date, list);
  }
  const days: DaySlots[] = Array.from(slotsByDate.entries()).map(([date, daySlots]) => ({
    date,
    label: formatSlotDate(date),
    slots: daySlots.map((s) => ({ startTime: s.startTime, scheduledAtUtc: s.scheduledAtUtc })),
  }));

  // "Acepta tarjeta" no basta con que el terapeuta lo haya marcado en
  // /dashboard/pagos — hasta que Stripe Connect está de verdad activo no se
  // le puede ofrecer esa opción al paciente (mismo criterio que
  // lib/appointments.ts al validar del lado del servidor).
  const cardAvailable = Boolean(
    therapist.accepts_card_payment && therapist.stripe_connect_charges_enabled
  );
  const cashAvailable = therapist.accepts_cash_payment !== false;

  // Contador "Sesiones / Reviews / Años" del perfil público. Sesiones y
  // años ya están conectados a datos reales; reviews se deja en 0 a
  // propósito — no existe todavía un sistema de calificaciones (ver
  // pendiente de "ratings de terapeutas"), y mostrar un número inventado
  // ahí sería engañoso para quien visita el perfil. En cuanto exista la
  // tabla de reviews, este query se agrega igual que el de sesiones.
  const { count: sessionsCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", therapist.id)
    .eq("status", "completed");

  const yearsOnLemy = Math.floor(
    (Date.now() - new Date(therapist.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const specialties = (therapist.therapist_specialties ?? [])
    .map((s) => s.specialty)
    .filter((s): s is CatalogItem => Boolean(s));
  const approaches = (therapist.therapist_approaches ?? [])
    .map((a) => a.approach)
    .filter((a): a is CatalogItem => Boolean(a));

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: therapist.display_name,
    jobTitle: "Psicoterapeuta",
    description: therapist.bio ?? therapist.tagline ?? undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx"}/${therapist.slug}`,
    knowsAbout: specialties.map((s) => s.nombre_coloquial),
    address: therapist.city
      ? { "@type": "PostalAddress", addressLocality: therapist.city, addressCountry: "MX" }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <SiteHeader />
      <QuizFloatingTab />

      <main>
        <section className="px-6 pt-8 pb-16 sm:px-8 sm:pt-10 md:pb-20">
          <div className="mx-auto max-w-[1180px]">
            <ScrollReveal>
              <div className="signature-corner mx-auto max-w-[480px] rounded-[36px] border border-line bg-card p-8 text-center sm:p-10">
                {therapist.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={therapist.photo_url}
                    alt=""
                    className="mx-auto h-[130px] w-[130px] rounded-full object-cover"
                  />
                ) : (
                  <div className="mx-auto flex h-[130px] w-[130px] items-center justify-center rounded-full bg-gradient-to-br from-rose to-rose-deep font-display text-4xl font-semibold text-white">
                    {initialsFrom(therapist.display_name)}
                  </div>
                )}

                {(therapist.instagram_url || therapist.facebook_url || therapist.tiktok_url) && (
                  <div className="mt-4 flex justify-center gap-2.5">
                    {therapist.instagram_url && (
                      <a
                        href={therapist.instagram_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Instagram"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-forest/[0.08] text-forest transition-colors hover:bg-forest hover:text-sage-white"
                      >
                        <InstagramIcon />
                      </a>
                    )}
                    {therapist.facebook_url && (
                      <a
                        href={therapist.facebook_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Facebook"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-forest/[0.08] text-forest transition-colors hover:bg-forest hover:text-sage-white"
                      >
                        <FacebookIcon />
                      </a>
                    )}
                    {therapist.tiktok_url && (
                      <a
                        href={therapist.tiktok_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="TikTok"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-forest/[0.08] text-forest transition-colors hover:bg-forest hover:text-sage-white"
                      >
                        <TikTokIcon />
                      </a>
                    )}
                  </div>
                )}

                <h1 className="mt-4.5 font-display text-[1.5rem] text-forest">{therapist.display_name}</h1>
                {therapist.profession && (
                  <p className="mt-0.5 text-[0.82rem] text-[#7C877F]">{therapist.profession}</p>
                )}
                {therapist.tagline && (
                  <p className="mt-1 font-mono text-[0.85rem] text-rose-deep">{therapist.tagline}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                  {therapist.verification_status === "verified" ? (
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-forest/[0.08] px-3 py-1 font-mono text-[0.72rem] text-forest">
                      ✓ Cédula verificada
                    </p>
                  ) : (
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-[#8B978F]/10 px-3 py-1 font-mono text-[0.72rem] text-[#7C877F]">
                      Perfil no verificado
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <p className="font-display text-[1.15rem] text-forest">{sessionsCount ?? 0}</p>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.06em] text-[#8B978F]">
                        Sesiones
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-[1.15rem] text-forest">0</p>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.06em] text-[#8B978F]">
                        Reviews
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-[1.15rem] text-forest">{yearsOnLemy}</p>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.06em] text-[#8B978F]">
                        Años
                      </p>
                    </div>
                  </div>
                </div>
                {therapist.is_in_person_available && (therapist.zona || therapist.city) && (
                  <p className="mt-2 text-[0.85rem] text-[#5A665F]">
                    📍 {[therapist.zona, therapist.city].filter(Boolean).join(", ")}
                  </p>
                )}

                <div className="mx-auto mt-6 flex max-w-[300px] flex-col gap-2.5">
                  <Button href="#agenda" variant="primary" className="w-full">
                    Agendar consulta
                  </Button>
                  {therapist.whatsapp_public && (
                    <a
                      href={whatsappLink(therapist.whatsapp_public)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#1fbd59] active:scale-95"
                    >
                      <WhatsAppIcon />
                      Contactar por WhatsApp
                    </a>
                  )}
                  <ShareProfileButton
                    profileUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx"}/${therapist.slug}`}
                    therapistName={therapist.display_name}
                  />
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal className="mt-8">
              <div className="signature-corner grid grid-cols-1 gap-10 rounded-[36px] border border-line bg-card p-8 md:grid-cols-[0.85fr_1.15fr] md:gap-12 md:p-13">
                <div className="border-b border-line pb-7 md:border-b-0 md:border-r md:pb-0 md:pr-11">
                  <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                    Datos generales
                  </h4>
                  <div className="space-y-2.5 text-[0.88rem] text-[#3E4B44]">
                    <div>
                      <strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">
                        Modalidad
                      </strong>
                      {therapist.is_online_available && therapist.is_in_person_available
                        ? "En línea o presencial"
                        : therapist.is_online_available
                          ? "En línea"
                          : therapist.is_in_person_available
                            ? "Presencial"
                            : "Agenda llena por ahora"}
                    </div>
                    {therapist.languages && therapist.languages.length > 0 && (
                      <div>
                        <strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">
                          Idiomas
                        </strong>
                        {therapist.languages.join(", ")}
                      </div>
                    )}
                    <div>
                      <strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">
                        Tarifa
                      </strong>
                      {priceLabel(therapist.price_min, therapist.price_max)}
                    </div>
                  </div>
                </div>

                <div>
                  {therapist.bio && (
                    <>
                      <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                        Sobre mí
                      </h4>
                      <p className="mb-6.5 text-[0.96rem] text-[#37433D]">{therapist.bio}</p>
                    </>
                  )}

                  {approaches.length > 0 && (
                    <>
                      <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                        Enfoque terapéutico
                      </h4>
                      <div className="mb-2.5 space-y-3">
                        {approaches.map((a) => (
                          <div key={a.slug}>
                            <p className="font-medium text-forest">{a.nombre_tecnico ?? a.nombre_coloquial}</p>
                            {a.descripcion_coloquial && (
                              <p className="mt-0.5 text-[0.85rem] text-[#7C877F]">
                                {a.descripcion_coloquial}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      <Link
                        href="/enfoques"
                        className="mb-6.5 inline-block text-[0.82rem] font-medium text-rose-deep underline underline-offset-2"
                      >
                        Aprende más sobre los enfoques de terapia →
                      </Link>
                    </>
                  )}

                  {specialties.length > 0 && (
                    <>
                      <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                        Trabaja contigo si buscas
                      </h4>
                      <div className="mb-6.5 flex flex-wrap gap-2">
                        {specialties.map((s) => (
                          <Tag key={s.slug}>{s.nombre_coloquial}</Tag>
                        ))}
                      </div>
                    </>
                  )}

                  {therapist.client_niches && therapist.client_niches.length > 0 && (
                    <>
                      <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                        A quién atiende
                      </h4>
                      <p className="mb-6.5 text-[0.96rem] text-[#37433D]">
                        {therapist.client_niches.join(", ")}
                      </p>
                    </>
                  )}

                  {therapist.therapy_types && therapist.therapy_types.length > 0 && (
                    <>
                      <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                        Tipo de terapia
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {therapist.therapy_types.map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal className="mt-10">
              <div id="agenda" className="signature-corner rounded-[36px] border border-line bg-card p-8 md:p-13">
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
                  Agenda tu sesión
                </p>
                <h2 className="mt-2.5 font-display text-[1.4rem] text-forest">
                  Elige un horario disponible
                </h2>

                {solicitado === "1" && (
                  <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
                    Listo, tu solicitud quedó registrada. {therapist.display_name.split(" ")[0]} la va a
                    confirmar y te llegará el enlace de la sesión.
                  </p>
                )}
                {ocupado === "1" && (
                  <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
                    Justo se ocupó ese horario. Elige otro de la lista.
                  </p>
                )}
                {error === "1" && (
                  <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
                    Algo no salió bien, intenta de nuevo.
                  </p>
                )}
                {propio === "1" && (
                  <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
                    No puedes agendar una cita contigo mismo.
                  </p>
                )}

                {!therapist.is_online_available && !therapist.is_in_person_available ? (
                  <p className="mt-5 text-[0.92rem] text-[#42504A]">
                    {therapist.display_name.split(" ")[0]} tiene la agenda llena por ahora — no está
                    aceptando citas nuevas en este momento.
                  </p>
                ) : days.length === 0 ? (
                  <p className="mt-5 text-[0.92rem] text-[#42504A]">
                    {therapist.display_name.split(" ")[0]} todavía no tiene horarios disponibles
                    cargados. Vuelve a revisar en unos días.
                  </p>
                ) : (
                  <div className="mt-6">
                    {!cardAvailable && (
                      <p className="mb-4 text-[0.85rem] text-[#7C877F]">
                        El pago de esta sesión se acuerda directamente con{" "}
                        {therapist.display_name.split(" ")[0]} (por ejemplo, en efectivo).
                      </p>
                    )}
                    <BookingCalendar
                      days={days}
                      therapistSlug={therapist.slug}
                      therapistName={therapist.display_name}
                      priceLabel={priceLabel(therapist.price_min, therapist.price_max)}
                      onlineAvailable={therapist.is_online_available}
                      inPersonAvailable={therapist.is_in_person_available}
                      cardAvailable={cardAvailable}
                      cashAvailable={cashAvailable}
                      requestAppointment={requestAppointment}
                    />
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

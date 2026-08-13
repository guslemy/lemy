import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { VerificationReviewButton } from "@/components/verification-review-button";
import { AdminTabs, type AdminTab } from "@/components/admin-tabs";
import { deactivateUser, reactivateUser } from "./actions";
import { addEducationalContent, deleteEducationalContent } from "../contenido/actions";

// Panel de administración unificado — antes eran 2 páginas separadas
// (/dashboard/contenido y /dashboard/admin, esta última con la revisión de
// verificaciones metida en un popup dentro de la tabla de usuarios).
// Gustavo pidió fusionarlo en una sola pantalla con pestañas (2026-08-14):
// se abre en "Panel de contenido", y cambiar a "Verificaciones" o "Gestión
// de usuarios" no navega a otro lado — cambia ahí mismo (ver AdminTabs).
//
// Se dividió "Verificaciones" como su propia pestaña (antes vivía dentro de
// Gestión de usuarios) porque revisar documentos es una tarea aparte de
// administrar cuentas — mezclarlas en una sola tabla con pacientes/admins
// de por medio no era lo más eficiente para la tarea de revisión.
//
// Todo se consulta de una sola vez arriba (esto es un panel interno con
// pocos datos, no un endpoint público) y se le pasa ya armado a AdminTabs,
// que decide cuál mostrar sin volver a pedir nada al servidor.

const PLATFORMS = [
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "otro", label: "Otro" },
];

const ROLE_LABEL: Record<string, string> = { patient: "Paciente", therapist: "Terapeuta", admin: "Admin" };
const SUB_LABEL: Record<string, string> = {
  active: "Activa",
  trialing: "Prueba",
  past_due: "Pago atrasado",
  canceled: "Cancelada",
  inactive: "Sin suscripción",
};

type VideoRow = {
  id: string;
  title: string;
  platform: string;
  url: string;
  thumbnail_url: string | null;
  educational_content_specialties: { specialty: { nombre_coloquial: string } | null }[] | null;
};

type DocLinks = { cedula: string | null; identificacion: string | null; titulo: string | null };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    desactivado?: string;
    reactivado?: string;
    verificacion_actualizada?: string;
    guardado?: string;
    eliminado?: string;
    error?: string;
  }>;
}) {
  const { tab, q, desactivado, reactivado, verificacion_actualizada, guardado, eliminado, error } =
    await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (myProfile?.role !== "admin") redirect("/dashboard");

  const serviceClient = createServiceClient();

  const [
    { data: profiles },
    { data: therapistRows },
    { data: authUsers },
    { data: specialties },
    { data: rawVideos },
  ] = await Promise.all([
    serviceClient
      .from("profiles")
      .select("id, role, full_name, phone, deactivated_at, created_at")
      .order("created_at", { ascending: false }),
    serviceClient
      .from("therapists")
      .select(
        "id, slug, display_name, subscription_status, subscription_plan, stripe_connect_charges_enabled, is_published, verification_status, verified_by, verified_at"
      ),
    // listUsers pagina de a 1000 por default — de sobra para el tamaño
    // actual de Lemy. Si algún día se acerca a ese límite, hay que paginar.
    serviceClient.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("specialties").select("id, nombre_coloquial").order("nombre_coloquial"),
    supabase
      .from("educational_content")
      .select(
        "id, title, platform, url, thumbnail_url, created_at, educational_content_specialties ( specialty:specialties ( nombre_coloquial ) )"
      )
      .order("created_at", { ascending: false }),
  ]);

  const therapistById = new Map((therapistRows ?? []).map((t) => [t.id, t]));
  const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const videos = (rawVideos ?? []) as unknown as VideoRow[];

  // Documentos de verificación: una consulta para todos los terapeutas +
  // URLs firmadas (el bucket es privado, ver migración 0030) — válidas 20
  // minutos, de sobra para revisar en una sesión; si expiran, recargar la
  // página las regenera. Se agrupan por terapeuta DESPUÉS de esperar todas
  // las promesas (no dentro del map) para no pisarse entre sí escribiendo
  // al mismo Map de forma concurrente.
  const therapistIds = (therapistRows ?? []).map((t) => t.id);
  const { data: credentialRows } = therapistIds.length
    ? await serviceClient
        .from("therapist_credentials")
        .select("therapist_id, tipo, documento_url")
        .in("therapist_id", therapistIds)
        .in("tipo", ["cedula", "identificacion", "titulo"])
    : { data: [] as { therapist_id: string; tipo: string; documento_url: string | null }[] };

  const signedResults = await Promise.all(
    (credentialRows ?? [])
      .filter((row): row is typeof row & { documento_url: string } => Boolean(row.documento_url))
      .map(async (row) => {
        const { data: signed } = await serviceClient.storage
          .from("therapist-documents")
          .createSignedUrl(row.documento_url, 60 * 20);
        return { therapist_id: row.therapist_id, tipo: row.tipo, url: signed?.signedUrl ?? null };
      })
  );

  const documentsByTherapist = new Map<string, DocLinks>();
  for (const r of signedResults) {
    const entry = documentsByTherapist.get(r.therapist_id) ?? {
      cedula: null,
      identificacion: null,
      titulo: null,
    };
    if (r.tipo === "cedula") entry.cedula = r.url;
    if (r.tipo === "identificacion") entry.identificacion = r.url;
    if (r.tipo === "titulo") entry.titulo = r.url;
    documentsByTherapist.set(r.therapist_id, entry);
  }

  // ── Pestaña: Verificaciones ──────────────────────────────────────────
  // Solo terapeutas, sin verificar primero — es la lista de "qué hay que
  // revisar hoy", no un directorio general de cuentas.
  const therapistsForReview = (therapistRows ?? [])
    .slice()
    .sort((a, b) => {
      const ta = a.verification_status === "verified" ? 1 : 0;
      const tb = b.verification_status === "verified" ? 1 : 0;
      if (ta !== tb) return ta - tb;
      return (a.display_name || "").localeCompare(b.display_name || "", "es");
    });

  // ── Pestaña: Gestión de usuarios ─────────────────────────────────────
  const query = (q ?? "").trim().toLowerCase();
  const userRows = (profiles ?? [])
    .map((p) => ({
      ...p,
      email: emailById.get(p.id) ?? "",
      therapist: therapistById.get(p.id) ?? null,
    }))
    .filter((r) => {
      if (!query) return true;
      return (
        (r.full_name ?? "").toLowerCase().includes(query) || r.email.toLowerCase().includes(query)
      );
    });

  const tabs: AdminTab[] = [
    {
      key: "contenido",
      label: "Panel de contenido",
      content: (
        <ContenidoTab
          specialties={specialties ?? []}
          videos={videos}
          guardado={guardado}
          eliminado={eliminado}
          error={error}
        />
      ),
    },
    {
      key: "verificaciones",
      label: "Verificaciones",
      content: (
        <VerificacionesTab
          therapists={therapistsForReview}
          emailById={emailById}
          documentsByTherapist={documentsByTherapist}
          verificacionActualizada={verificacion_actualizada}
        />
      ),
    },
    {
      key: "usuarios",
      label: "Gestión de usuarios",
      content: (
        <UsuariosTab
          rows={userRows}
          q={q}
          desactivado={desactivado}
          reactivado={reactivado}
          error={error}
        />
      ),
    },
  ];

  const initialTabKey = tabs.some((t) => t.key === tab) ? (tab as string) : "contenido";

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[980px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Panel de administración
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Todo en un solo lugar
          </h1>

          <div className="mt-8">
            <AdminTabs tabs={tabs} initialTabKey={initialTabKey} />
          </div>

          <BackToDashboard />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function ContenidoTab({
  specialties,
  videos,
  guardado,
  eliminado,
  error,
}: {
  specialties: { id: string; nombre_coloquial: string }[];
  videos: VideoRow[];
  guardado?: string;
  eliminado?: string;
  error?: string;
}) {
  return (
    <div>
      <p className="text-[0.95rem] text-[#3E4B44]">
        Cada video puede tener una o varias palabras clave. Aparecen en el buscador cuando alguien
        filtra por alguna de ellas, para que llegue más preparad@ a su consulta.
      </p>

      {guardado === "1" && <Banner>Video agregado.</Banner>}
      {eliminado === "1" && <Banner>Video eliminado.</Banner>}
      {error === "1" && <Banner tone="error">Falta título, link o al menos una palabra clave.</Banner>}

      <form
        action={addEducationalContent}
        className="signature-corner mt-6 space-y-4 rounded-[28px] border border-line bg-card p-7"
      >
        <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
          Agregar video
        </h2>

        <Field label="Título">
          <input
            name="title"
            required
            className="input-lemy"
            placeholder="Ej. Qué es la ansiedad y cómo se siente"
          />
        </Field>

        <div>
          <span className="mb-2 block text-[0.85rem] font-medium text-forest">
            Palabras clave (elige todas las que apliquen)
          </span>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {specialties.map((s) => (
              <label key={s.id} className="flex items-center gap-2.5 text-[0.88rem] text-[#3E4B44]">
                <input type="checkbox" name="specialties" value={s.id} className="h-4 w-4 accent-forest" />
                {s.nombre_coloquial}
              </label>
            ))}
          </div>
        </div>

        <Field label="Plataforma">
          <select name="platform" defaultValue="youtube" className="input-lemy">
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Link del video" hint="No hace falta que empiece con https:// — lo agregamos nosotros">
          <input name="url" type="text" required className="input-lemy" placeholder="youtube.com/..." />
        </Field>

        <Field
          label="Thumbnail (opcional)"
          hint="Solo hace falta para Instagram/TikTok — en YouTube la tomamos automáticamente. Si la dejas vacía, se usa una portada ilustrada de Lemy."
        >
          <input name="thumbnail_url" type="text" className="input-lemy" placeholder="Link a una imagen (opcional)" />
        </Field>

        <SubmitButton pendingText="Guardando…">Guardar video</SubmitButton>
      </form>

      <div className="mt-8 space-y-3">
        {videos.length === 0 && (
          <p className="text-[0.9rem] text-[#5A665F]">Todavía no has agregado ningún video.</p>
        )}

        {videos.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card px-5 py-4"
          >
            <div className="min-w-0">
              <p className="truncate text-[0.95rem] font-medium text-forest">{v.title}</p>
              <p className="mt-0.5 truncate text-[0.8rem] text-[#5A665F]">
                {(v.educational_content_specialties ?? [])
                  .map((es) => es.specialty?.nombre_coloquial)
                  .filter(Boolean)
                  .join(", ") || "—"}{" "}
                · {v.platform}
              </p>
            </div>
            <div className="flex flex-none items-center gap-4">
              <a
                href={v.url}
                target="_blank"
                rel="noreferrer"
                className="text-[0.85rem] font-medium text-forest hover:text-rose-deep"
              >
                Ver ↗
              </a>
              <form action={deleteEducationalContent}>
                <input type="hidden" name="id" value={v.id} />
                <button type="submit" className="text-[0.85rem] font-medium text-rose-deep hover:text-[#a86356]">
                  Eliminar
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerificacionesTab({
  therapists,
  emailById,
  documentsByTherapist,
  verificacionActualizada,
}: {
  therapists: {
    id: string;
    display_name: string;
    verification_status: string;
    verified_by: string | null;
    verified_at: string | null;
  }[];
  emailById: Map<string, string>;
  documentsByTherapist: Map<string, DocLinks>;
  verificacionActualizada?: string;
}) {
  const pendingCount = therapists.filter((t) => t.verification_status !== "verified").length;

  return (
    <div>
      <p className="text-[0.95rem] text-[#3E4B44]">
        {pendingCount === 0
          ? "No hay terapeutas pendientes de revisar."
          : `${pendingCount} terapeuta${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"} de revisar.`}
      </p>

      {verificacionActualizada === "1" && <Banner>Verificación actualizada.</Banner>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[480px] text-left text-[0.85rem]">
          <thead className="bg-forest/[0.04] text-[0.72rem] uppercase tracking-[0.06em] text-[#7C877F]">
            <tr>
              <th className="px-4 py-3">Terapeuta</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {therapists.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="px-4 py-3 text-forest">{t.display_name || "—"}</td>
                <td className="px-4 py-3">
                  <VerificationReviewButton
                    therapistId={t.id}
                    name={t.display_name || "—"}
                    status={t.verification_status}
                    verifiedByEmail={t.verified_by ? emailById.get(t.verified_by) ?? null : null}
                    verifiedAt={t.verified_at}
                    documents={
                      documentsByTherapist.get(t.id) ?? { cedula: null, identificacion: null, titulo: null }
                    }
                  />
                </td>
              </tr>
            ))}
            {therapists.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-[#8B978F]">
                  Todavía no hay terapeutas registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsuariosTab({
  rows,
  q,
  desactivado,
  reactivado,
  error,
}: {
  rows: {
    id: string;
    role: string;
    full_name: string | null;
    deactivated_at: string | null;
    email: string;
    therapist: {
      subscription_status: string | null;
      subscription_plan: string | null;
      stripe_connect_charges_enabled: boolean;
      verification_status: string;
    } | null;
  }[];
  q?: string;
  desactivado?: string;
  reactivado?: string;
  error?: string;
}) {
  const query = (q ?? "").trim();

  return (
    <div>
      <p className="text-[0.9rem] text-[#7C877F]">
        {rows.length} cuenta{rows.length === 1 ? "" : "s"}
        {query && ` que coinciden con "${query}"`}
      </p>

      {desactivado === "1" && <Banner>Cuenta desactivada. Puede reactivarse cuando quieras.</Banner>}
      {reactivado === "1" && <Banner>Cuenta reactivada.</Banner>}
      {error === "self" && (
        <Banner tone="error">No puedes desactivar tu propia cuenta de admin desde aquí.</Banner>
      )}

      <form method="GET" className="mt-6 flex gap-2.5">
        <input type="hidden" name="tab" value="usuarios" />
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre o correo…"
          className="input-lemy flex-1"
        />
        <button
          type="submit"
          className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-sage-white hover:bg-forest-deep"
        >
          Buscar
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[720px] text-left text-[0.85rem]">
          <thead className="bg-forest/[0.04] text-[0.72rem] uppercase tracking-[0.06em] text-[#7C877F]">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Suscripción / Stripe</th>
              <th className="px-4 py-3">Verificación</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-4 py-3 text-forest">{r.full_name || "—"}</td>
                <td className="px-4 py-3 text-[#5A665F]">{r.email}</td>
                <td className="px-4 py-3">{ROLE_LABEL[r.role] ?? r.role}</td>
                <td className="px-4 py-3">
                  {r.deactivated_at ? (
                    <span className="text-rose-deep">Desactivada</span>
                  ) : (
                    <span className="text-forest">Activa</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#5A665F]">
                  {r.therapist ? (
                    <>
                      {SUB_LABEL[r.therapist.subscription_status ?? "inactive"] ?? "—"}
                      {r.therapist.subscription_plan ? ` (${r.therapist.subscription_plan})` : ""}
                      {" · Stripe Connect: "}
                      {r.therapist.stripe_connect_charges_enabled ? "conectado" : "no conectado"}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.therapist ? (
                    r.therapist.verification_status === "verified" ? (
                      <span className="text-forest">✓ Verificado</span>
                    ) : (
                      <span className="text-[#8B978F]">No verificado</span>
                    )
                  ) : (
                    <span className="text-[#B7C0BB]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.role === "admin" ? (
                    <span className="text-[#B7C0BB]">—</span>
                  ) : r.deactivated_at ? (
                    <form action={reactivateUser}>
                      <input type="hidden" name="user_id" value={r.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-forest/30 px-4 py-1.5 text-[0.8rem] font-medium text-forest hover:bg-forest/[0.06]"
                      >
                        Reactivar
                      </button>
                    </form>
                  ) : (
                    <form action={deactivateUser}>
                      <input type="hidden" name="user_id" value={r.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`¿Seguro que quieres desactivar la cuenta de ${r.full_name || r.email}? No podrá iniciar sesión hasta que la reactives.`}
                        className="rounded-full border border-rose-deep/30 px-4 py-1.5 text-[0.8rem] font-medium text-rose-deep hover:bg-rose/10"
                      >
                        Desactivar
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

function Banner({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "error" }) {
  return (
    <p
      className={`mt-4 rounded-2xl border px-5 py-3 text-[0.9rem] ${
        tone === "error"
          ? "border-rose-deep/40 bg-rose/10 text-rose-deep"
          : "border-line bg-forest/[0.06] text-forest"
      }`}
    >
      {children}
    </p>
  );
}

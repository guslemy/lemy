import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deactivateUser, reactivateUser, setVerificationStatus } from "./actions";

// Panel de administración — solo visible para profiles.role = 'admin'
// (Gustavo tiene que ponerse ese rol a mano una vez desde Supabase, ver
// checklist). Junta datos de 3 fuentes porque no hay una sola tabla que los
// tenga todos: auth.users (email, vía service role), profiles (rol/nombre/
// desactivación) y therapists (suscripción/Stripe Connect, solo aplica a
// terapeutas). "Eliminar" aquí es DESACTIVAR (reversible) — el borrado de
// verdad, irreversible, es un flujo aparte (reset masivo de prueba).
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    desactivado?: string;
    reactivado?: string;
    verificacion_actualizada?: string;
    error?: string;
  }>;
}) {
  const { q, desactivado, reactivado, verificacion_actualizada, error } = await searchParams;
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

  const { data: profiles } = await serviceClient
    .from("profiles")
    .select("id, role, full_name, phone, deactivated_at, created_at")
    .order("created_at", { ascending: false });

  const { data: therapistRows } = await serviceClient
    .from("therapists")
    .select(
      "id, slug, subscription_status, subscription_plan, stripe_connect_charges_enabled, is_published, verification_status"
    );
  const therapistById = new Map((therapistRows ?? []).map((t) => [t.id, t]));

  // listUsers pagina de a 1000 por default — de sobra para el tamaño actual
  // de Lemy. Si algún día se acerca a ese límite, hay que paginar de verdad.
  const { data: authUsers } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  const query = (q ?? "").trim().toLowerCase();
  const rows = (profiles ?? [])
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

  const ROLE_LABEL: Record<string, string> = { patient: "Paciente", therapist: "Terapeuta", admin: "Admin" };
  const SUB_LABEL: Record<string, string> = {
    active: "Activa",
    trialing: "Prueba",
    past_due: "Pago atrasado",
    canceled: "Cancelada",
    inactive: "Sin suscripción",
  };

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[980px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Panel de admin
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Usuarios
          </h1>
          <p className="mt-2 text-[0.9rem] text-[#7C877F]">
            {rows.length} cuenta{rows.length === 1 ? "" : "s"}
            {query && ` que coinciden con "${q}"`}
          </p>

          {desactivado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Cuenta desactivada. Puede reactivarse cuando quieras.
            </p>
          )}
          {reactivado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Cuenta reactivada.
            </p>
          )}
          {verificacion_actualizada === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Verificación actualizada.
            </p>
          )}
          {error === "self" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              No puedes desactivar tu propia cuenta de admin desde aquí.
            </p>
          )}

          <form method="GET" className="mt-6 flex gap-2.5">
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
                          <div className="flex items-center gap-2">
                            <span className="text-forest">✓ Verificado</span>
                            <form action={setVerificationStatus}>
                              <input type="hidden" name="therapist_id" value={r.id} />
                              <input type="hidden" name="status" value="pending" />
                              <button
                                type="submit"
                                className="text-[0.78rem] text-[#7C877F] underline underline-offset-2 hover:text-forest"
                              >
                                Quitar
                              </button>
                            </form>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[#8B978F]">No verificado</span>
                            <form action={setVerificationStatus}>
                              <input type="hidden" name="therapist_id" value={r.id} />
                              <input type="hidden" name="status" value="verified" />
                              <button
                                type="submit"
                                className="rounded-full border border-forest/30 px-3 py-1 text-[0.78rem] font-medium text-forest hover:bg-forest/[0.06]"
                              >
                                Marcar verificado
                              </button>
                            </form>
                          </div>
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

          <BackToDashboard />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

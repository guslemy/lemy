import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveProfileAndContinue } from "./actions";

// Paso intermedio antes de reservar: pedimos nombre y teléfono si el perfil
// todavía no los tiene (por ejemplo, quien entró con Google no siempre trae
// teléfono). Si venía de intentar agendar una cita, al guardar retoma esa
// misma reserva — ver next_slug/next_scheduled_at en actions.ts.
export default async function CompletarPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{
    next_slug?: string;
    next_scheduled_at?: string;
    next_modality?: string;
    error?: string;
  }>;
}) {
  const { next_slug, next_scheduled_at, next_modality, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const params = new URLSearchParams({ next: "/completar-perfil" });
    redirect(`/login?${params.toString()}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[520px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Un último paso
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Completa tus datos para reservar
          </h1>
          <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
            Con esto tu terapeuta puede contactarte sobre tu cita, y lo usamos más adelante para
            ligar tu método de pago.
          </p>

          {error === "1" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Revisa tu nombre y que el teléfono tenga al menos 10 dígitos.
            </p>
          )}

          <form
            action={saveProfileAndContinue}
            className="signature-corner mt-8 space-y-5 rounded-[28px] border border-line bg-card p-7"
          >
            <input type="hidden" name="next_slug" value={next_slug ?? ""} />
            <input type="hidden" name="next_scheduled_at" value={next_scheduled_at ?? ""} />
            <input type="hidden" name="next_modality" value={next_modality ?? "online"} />

            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Correo</span>
              <input
                type="email"
                value={user!.email ?? ""}
                disabled
                className="input-lemy opacity-60"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Nombre completo</span>
              <input
                type="text"
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                placeholder="Ej. Ana López Martínez"
                required
                minLength={2}
                className="input-lemy"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Teléfono</span>
              <input
                type="tel"
                name="phone"
                defaultValue={profile?.phone ?? ""}
                placeholder="Ej. 951 123 4567"
                required
                minLength={10}
                className="input-lemy"
              />
            </label>

            <SubmitButton pendingText="Guardando…" className="w-full">
              {next_slug ? "Guardar y continuar con mi reserva" : "Guardar"}
            </SubmitButton>
          </form>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

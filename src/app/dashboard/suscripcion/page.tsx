import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { createSubscriptionCheckout } from "./actions";

// Estado de la suscripción del terapeuta: prueba gratis, activa, vencida, o
// sin empezar. El botón de cada plan dispara un Checkout real de Stripe.
//
// Nombres de cara al usuario. El identificador interno ("base"/"plus") no
// cambia — vive en Stripe metadata y en therapists.subscription_plan — solo
// la etiqueta que se muestra en pantalla.
const PLAN_LABELS: Record<string, string> = {
  base: "Empieza",
  plus: "Gestiona",
};

export default async function SuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; cancelado?: string; error?: string }>;
}) {
  const { ok, cancelado, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "therapist") redirect("/dashboard");

  const { data: therapist } = await supabase
    .from("therapists")
    .select("trial_ends_at, is_founding_member, subscription_status, subscription_plan")
    .eq("id", user.id)
    .maybeSingle();

  const trialEndsAt = therapist?.trial_ends_at ? new Date(therapist.trial_ends_at) : null;
  const trialActive = trialEndsAt ? trialEndsAt.getTime() > Date.now() : false;
  const trialDaysLeft = trialActive
    ? Math.ceil((trialEndsAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : 0;
  const subscriptionActive = therapist?.subscription_status === "active";

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[680px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Tu cuenta
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Suscripción
          </h1>

          {ok === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Listo, tu suscripción quedó activa.
            </p>
          )}
          {cancelado === "1" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              No se completó el pago. Puedes intentar de nuevo cuando quieras.
            </p>
          )}
          {error === "1" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Algo no salió bien con Stripe, intenta de nuevo.
            </p>
          )}

          {therapist?.is_founding_member && !subscriptionActive && (
            <p className="mt-5 rounded-2xl border border-rose-deep/30 bg-rose/10 px-5 py-3 text-[0.85rem] text-rose-deep">
              Eres terapeuta fundador: al suscribirte se aplica 30% de descuento durante 3 meses, y tu
              precio queda bloqueado por 1 año.
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-line bg-card p-6">
            {subscriptionActive ? (
              <p className="text-[0.95rem] text-forest">
                Tu suscripción está <strong>activa</strong>
                {therapist?.subscription_plan &&
                  ` — plan ${PLAN_LABELS[therapist.subscription_plan] ?? therapist.subscription_plan}`}
                .
              </p>
            ) : trialActive ? (
              <p className="text-[0.95rem] text-[#3E4B44]">
                Estás en tu prueba gratis: te quedan <strong>{trialDaysLeft} días</strong>. Tu perfil
                sigue visible mientras dure. Suscríbete cuando quieras para que no se interrumpa.
              </p>
            ) : (
              <p className="text-[0.95rem] text-rose-deep">
                Tu prueba gratis terminó. Suscríbete para que tu perfil siga publicado en el buscador.
              </p>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-[24px] border border-line bg-card p-6">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.08em] text-rose-deep">
                Plan {PLAN_LABELS.base}
              </p>
              <p className="mt-2 font-display text-[1.6rem] text-forest">$249 MXN/mes</p>
              <form action={createSubscriptionCheckout} className="mt-5">
                <input type="hidden" name="plan" value="base" />
                <Button type="submit" variant="primary" className="w-full">
                  Suscribirme al plan {PLAN_LABELS.base}
                </Button>
              </form>
            </div>

            <div className="rounded-[24px] border border-line bg-card p-6">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.08em] text-rose-deep">
                Plan {PLAN_LABELS.plus}
              </p>
              <p className="mt-2 font-display text-[1.6rem] text-forest">$399 MXN/mes</p>
              <form action={createSubscriptionCheckout} className="mt-5">
                <input type="hidden" name="plan" value="plus" />
                <Button type="submit" variant="primary" className="w-full">
                  Suscribirme al plan {PLAN_LABELS.plus}
                </Button>
              </form>
            </div>
          </div>

          <BackToDashboard />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

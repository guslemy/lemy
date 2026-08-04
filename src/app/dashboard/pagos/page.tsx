import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { connectStripeAccount, syncStripeConnectStatus } from "./actions";

// Estado de la cuenta de Stripe Connect del terapeuta — de aquí depende si
// puede recibir cobros por cita (ver /[slug]: el botón de agendar se oculta
// si stripe_connect_charges_enabled es false). El pago es directo a la
// cuenta del terapeuta (Direct charge), Lemy solo se queda con una comisión
// (application_fee_amount) — el terapeuta es quien factura/reporta ante el
// SAT, no nosotros.
export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string; refresh?: string }>;
}) {
  const { return: justReturned } = await searchParams;
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

  if (justReturned === "1") {
    await syncStripeConnectStatus();
  }

  const { data: therapist } = await supabase
    .from("therapists")
    .select(
      "stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_details_submitted"
    )
    .eq("id", user.id)
    .maybeSingle();

  const chargesEnabled = Boolean(therapist?.stripe_connect_charges_enabled);
  const detailsSubmitted = Boolean(therapist?.stripe_connect_details_submitted);
  const hasAccount = Boolean(therapist?.stripe_connect_account_id);

  const statusLabel = chargesEnabled
    ? "Conectado"
    : hasAccount && detailsSubmitted
      ? "En revisión por Stripe"
      : hasAccount
        ? "Onboarding sin terminar"
        : "No conectado";

  const statusColor = chargesEnabled
    ? "border-forest/30 bg-forest/[0.06] text-forest"
    : "border-rose-deep/30 bg-rose/10 text-rose-deep";

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[680px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Tu cuenta
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Cobros por consulta
          </h1>
          <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
            Cuando un paciente reserva contigo, paga la consulta directo en tu cuenta de Stripe — Lemy
            solo se queda con una comisión pequeña por cita. Tú eres quien recibe el dinero y quien
            factura, no nosotros.
          </p>

          <div className={`mt-6 rounded-2xl border px-5 py-4 text-[0.9rem] ${statusColor}`}>
            Estado: <strong>{statusLabel}</strong>
            {!chargesEnabled && (
              <p className="mt-1 text-[0.85rem]">
                Mientras no termines esto, tu perfil no podrá recibir citas nuevas — los pacientes verán
                tu página, pero no podrán agendar hasta que actives tus cobros.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-card p-6">
            <form action={connectStripeAccount}>
              <Button type="submit" variant="primary" className="w-full">
                {hasAccount ? "Continuar / actualizar mi información" : "Conectar cuenta de Stripe"}
              </Button>
            </form>
            <p className="mt-3 text-[0.8rem] text-[#7C877F]">
              Te va a pedir tus datos fiscales y una cuenta bancaria a donde depositar — lo hace Stripe
              directamente, Lemy nunca ve esos datos.
            </p>
          </div>

          <BackToDashboard />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

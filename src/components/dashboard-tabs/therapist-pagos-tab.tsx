import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { connectStripeAccount, syncStripeConnectStatus, updatePaymentMethods } from "@/app/dashboard/pagos/actions";

// Estado de la cuenta de Stripe Connect del terapeuta — de aquí depende si
// puede cobrar sus sesiones con tarjeta a través de Lemy (ver /[slug]: sin
// esto conectado, el paciente igual puede agendar, solo que el pago se
// acuerda en efectivo o por su cuenta con el terapeuta). El pago con tarjeta
// es directo a la cuenta del terapeuta (Direct charge), Lemy solo se queda
// con una comisión (application_fee_amount) — el terapeuta es quien
// factura/reporta ante el SAT, no nosotros.
export type PagosTabParams = {
  pagos_return?: string;
  pagos_error_metodos?: string;
  pagos_metodos_guardados?: string;
};

export async function TherapistPagosTab({ params }: { params: PagosTabParams }) {
  const { pagos_return: justReturned, pagos_error_metodos: error_metodos, pagos_metodos_guardados: metodos_guardados } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (justReturned === "1") {
    await syncStripeConnectStatus();
  }

  const { data: therapist } = await supabase
    .from("therapists")
    .select(
      "stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_details_submitted, accepts_card_payment, accepts_cash_payment"
    )
    .eq("id", user.id)
    .maybeSingle();

  const chargesEnabled = Boolean(therapist?.stripe_connect_charges_enabled);
  const detailsSubmitted = Boolean(therapist?.stripe_connect_details_submitted);
  const hasAccount = Boolean(therapist?.stripe_connect_account_id);
  const acceptsCard = therapist?.accepts_card_payment !== false;
  const acceptsCash = therapist?.accepts_cash_payment !== false;

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
    <div>
      <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
        Cuando un paciente reserva contigo, paga la consulta directo en tu cuenta de Stripe — Lemy
        solo se queda con una comisión pequeña por cita. Tú eres quien recibe el dinero y quien
        factura, no nosotros.
      </p>

      <div className={`mt-6 rounded-2xl border px-5 py-4 text-[0.9rem] ${statusColor}`}>
        Estado: <strong>{statusLabel}</strong>
        {!chargesEnabled && (
          <p className="mt-1 text-[0.85rem]">
            Puedes seguir recibiendo citas sin esto — tus pacientes verán en tu página que el pago se
            acuerda directamente contigo (por ejemplo, en efectivo). Conecta tu cuenta cuando quieras
            empezar a cobrar con tarjeta a través de Lemy.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="mb-1 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
          Métodos de pago que aceptas
        </h2>
        <p className="mb-4 text-[0.85rem] text-[#7C877F]">
          Tus pacientes verán estas opciones al reservar. Marcar &quot;tarjeta&quot; no cobra nada
          todavía — solo aparece disponible de verdad una vez que termines de conectar tu cuenta
          de Stripe abajo.
        </p>

        {metodos_guardados === "1" && (
          <p className="mb-4 rounded-2xl border border-line bg-forest/[0.06] px-4 py-2.5 text-[0.85rem] text-forest">
            Guardado.
          </p>
        )}
        {error_metodos === "1" && (
          <p className="mb-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-4 py-2.5 text-[0.85rem] text-rose-deep">
            Necesitas dejar marcado al menos un método de pago.
          </p>
        )}

        <form action={updatePaymentMethods} className="space-y-3">
          <label className="flex items-center gap-2.5 text-[0.9rem] text-[#3E4B44]">
            <input
              type="checkbox"
              name="accepts_card_payment"
              defaultChecked={acceptsCard}
              className="h-4 w-4 rounded border-line accent-forest"
            />
            Tarjeta (a través de Lemy)
          </label>
          <label className="flex items-center gap-2.5 text-[0.9rem] text-[#3E4B44]">
            <input
              type="checkbox"
              name="accepts_cash_payment"
              defaultChecked={acceptsCash}
              className="h-4 w-4 rounded border-line accent-forest"
            />
            Efectivo / acordado directo con el paciente
          </label>
          <Button type="submit" variant="ghost" className="mt-1">
            Guardar métodos de pago
          </Button>
        </form>
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
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { formatDateOnly, formatMxn } from "@/lib/notifications/payment-templates";
import { cardPaymentStatusClasses, cardPaymentStatusLabel } from "@/lib/card-payment-status";

// Tablero "Pagos con tarjeta" del terapeuta (dentro de Cobros por consulta):
// qué se le ha cobrado, cuánto le queda y en qué punto va el dinero (cobrado,
// en camino al banco o depositado). Lo llena el webhook de Stripe Connect.

const TZ = "America/Mexico_City";
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const fmtCita = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });

type PaymentRow = {
  appointment_id: string;
  patient_id: string;
  amount_cents: number;
  lemy_fee_cents: number;
  net_cents: number | null;
  status: string;
  paid_at: string;
  expected_available_on: string | null;
  deposited_at: string | null;
};

export async function TherapistCardPayments({ therapistId }: { therapistId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_payments")
    .select("appointment_id, patient_id, amount_cents, lemy_fee_cents, net_cents, status, paid_at, expected_available_on, deposited_at")
    .eq("therapist_id", therapistId)
    .order("paid_at", { ascending: false })
    .limit(50);

  // Tabla aún no creada (antes de correr la migración 0047): no mostramos nada.
  if (error) return null;
  const rows = (data ?? []) as PaymentRow[];

  const header = (
    <>
      <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">Pagos con tarjeta</h2>
      <p className="mt-1 text-[0.85rem] text-[#7C877F]">
        Aquí ves cada cobro de tus pacientes y en qué punto va tu dinero. Stripe tarda unos días en depositar (los primeros
        pagos de una cuenta nueva suelen tardar más), así que es normal no verlo todavía en tu banco.
      </p>
    </>
  );

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-card p-6">
        {header}
        <p className="mt-4 text-[0.9rem] text-[#3E4B44]">Todavía no tienes pagos con tarjeta. Cuando un paciente pague, aparecerá aquí.</p>
      </div>
    );
  }

  const ids = Array.from(new Set(rows.map((r) => r.patient_id)));
  const { data: profiles } = await createServiceClient().from("profiles").select("id, full_name").in("id", ids);
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? "Paciente"]));

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, scheduled_at")
    .in("id", rows.map((r) => r.appointment_id));
  const whenById = new Map((appts ?? []).map((a) => [a.id as string, a.scheduled_at as string]));

  const live = rows.filter((r) => r.status !== "refunded");
  const sum = (xs: PaymentRow[]) => xs.reduce((s, r) => s + (r.net_cents ?? r.amount_cents - r.lemy_fee_cents), 0);
  const pending = live.filter((r) => r.status === "paid" || r.status === "payout_failed");
  const deposited = live.filter((r) => r.status === "deposited");

  return (
    <div className="mt-6 rounded-2xl border border-line bg-card p-6">
      {header}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-sage-white px-4 py-3">
          <p className="text-[0.72rem] text-[#8B978F]">En camino a tu banco</p>
          <p className="font-display text-[1.25rem] text-forest">{formatMxn(sum(pending))}</p>
        </div>
        <div className="rounded-xl border border-line bg-sage-white px-4 py-3">
          <p className="text-[0.72rem] text-[#8B978F]">Ya depositado</p>
          <p className="font-display text-[1.25rem] text-forest">{formatMxn(sum(deposited))}</p>
        </div>
        <div className="rounded-xl border border-line bg-sage-white px-4 py-3">
          <p className="text-[0.72rem] text-[#8B978F]">Pagos con tarjeta</p>
          <p className="font-display text-[1.25rem] text-forest">{live.length}</p>
        </div>
      </div>
      <p className="mt-2 text-[0.75rem] text-[#8B978F]">Los importes son lo que te queda después de las comisiones de Lemy y de Stripe.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[0.85rem]">
          <thead>
            <tr className="border-b border-line text-[0.72rem] uppercase tracking-[0.06em] text-[#7C877F]">
              <th className="py-2 pr-3 font-medium">Pagó</th>
              <th className="px-3 py-2 font-medium">Paciente y cita</th>
              <th className="px-3 py-2 text-right font-medium">Cobrado</th>
              <th className="px-3 py-2 text-right font-medium">Te quedan</th>
              <th className="py-2 pl-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const expected = r.status === "paid" ? formatDateOnly(r.expected_available_on) : null;
              const when = whenById.get(r.appointment_id);
              return (
                <tr key={r.appointment_id} className="border-b border-line/60 align-top last:border-0">
                  <td className="py-2.5 pr-3 text-[#3E4B44]">{fmtDate(r.paid_at)}</td>
                  <td className="px-3 py-2.5 text-[#3E4B44]">
                    <span className="font-medium text-forest">{nameById.get(r.patient_id) ?? "Paciente"}</span>
                    {when && <span className="block text-[0.78rem] text-[#8B978F]">Cita: {fmtCita(when)}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[#3E4B44]">{formatMxn(r.amount_cents)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-forest">
                    {r.net_cents !== null ? formatMxn(r.net_cents) : "Por confirmar"}
                  </td>
                  <td className="py-2.5 pl-3">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.75rem] ${cardPaymentStatusClasses(r.status)}`}>
                      {cardPaymentStatusLabel(r.status)}
                    </span>
                    {expected && <span className="mt-0.5 block text-[0.75rem] text-[#8B978F]">Estimado: {expected}</span>}
                    {r.status === "deposited" && r.deposited_at && (
                      <span className="mt-0.5 block text-[0.75rem] text-[#8B978F]">{fmtDate(r.deposited_at)}</span>
                    )}
                    {r.status === "payout_failed" && (
                      <span className="mt-0.5 block text-[0.75rem] text-rose-deep">Revisa tus datos bancarios en Stripe.</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

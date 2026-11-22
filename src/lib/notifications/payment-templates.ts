// Correos de pagos con tarjeta (Stripe Connect): recibo del paciente, aviso de
// cobro al terapeuta y aviso de depósito fallido. Mismo estilo que el resto
// (emailTemplates.ts). Los textos de usuario (nombres) se escapan porque aquí
// sí van dentro de tablas de importes.

import { wrap } from "./emailTemplates";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function formatMxn(cents: number) {
  return `$${(cents / 100).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}

// "jue 27 nov" a partir de una fecha YYYY-MM-DD (sin hora, para que no se
// corra de día por zona horaria).
export function formatDateOnly(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatPaidAt(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  });
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding: 6px 0; color: #7C877F; font-size: 14px;">${label}</td>
    <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #1F2A22;">${value}</td>
  </tr>`;
}

function table(rows: string[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 14px 0; border-top: 1px solid #E4E9DF; border-bottom: 1px solid #E4E9DF;">${rows.join("")}</table>`;
}

const BUTTON = (href: string, label: string) =>
  `<p style="margin: 24px 0 0;"><a href="${href}" style="display: inline-block; background: #21382b; color: #ffffff; padding: 11px 22px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">${label}</a></p>`;

// Recibo para el paciente, a nombre del terapeuta (a quien se le paga).
export function cardPaymentReceiptPatient(params: {
  patientName: string;
  therapistName: string;
  whenLabel: string;
  amountCents: number;
  paidAtIso: string;
  cardLabel: string | null;
  reference: string;
}) {
  const { patientName, therapistName, whenLabel, amountCents, paidAtIso, cardLabel, reference } = params;
  return {
    subject: `Recibo de tu pago — consulta con ${therapistName}`,
    html: wrap(`
      <h1 style="font-size: 21px; margin: 0 0 14px; color: #21382b; font-weight: 600;">Hola, ${esc(patientName)}</h1>
      <p>Recibimos tu pago. Tu cita quedó pagada y confirmada; no tienes que hacer nada más.</p>
      ${table([
        row("Pagado a", esc(therapistName)),
        row("Concepto", "Consulta de psicoterapia"),
        row("Fecha de la cita", esc(whenLabel)),
        row("Importe pagado", `<strong>${formatMxn(amountCents)}</strong>`),
        ...(cardLabel ? [row("Tarjeta", esc(cardLabel))] : []),
        row("Fecha del pago", formatPaidAt(paidAtIso)),
        row("Referencia", esc(reference)),
      ])}
      <p>El pago se hace directo a ${esc(therapistName)} a través de Stripe. Ya salió de tu tarjeta; el dinero llega a la cuenta bancaria del terapeuta en unos días, por eso puede que no lo veas reflejado en su lado todavía. No es un cobro doble ni pendiente.</p>
      <p style="font-size: 13px; color: #7C877F;">Este es un comprobante de pago, no una factura fiscal. Si necesitas factura, solicítala directamente a tu terapeuta.</p>
      ${BUTTON("https://lemy.mx/dashboard/mis-citas", "Ver mis citas →")}
    `),
  };
}

// Aviso de cobro para el terapeuta, con quién pagó y cuánto le queda.
export function cardPaymentReceivedTherapist(params: {
  therapistName: string;
  patientName: string;
  whenLabel: string;
  amountCents: number;
  lemyFeeCents: number;
  stripeFeeCents: number | null;
  netCents: number | null;
  expectedAvailableOn: string | null;
}) {
  const { therapistName, patientName, whenLabel, amountCents, lemyFeeCents, stripeFeeCents, netCents, expectedAvailableOn } = params;
  const expected = formatDateOnly(expectedAvailableOn);
  return {
    subject: `Recibiste un pago de ${formatMxn(amountCents)} — ${patientName}`,
    html: wrap(`
      <h1 style="font-size: 21px; margin: 0 0 14px; color: #21382b; font-weight: 600;">Hola, ${esc(therapistName)}</h1>
      <p><strong>${esc(patientName)}</strong> pagó su consulta con tarjeta. La cita del <strong>${esc(whenLabel)}</strong> quedó pagada y confirmada.</p>
      ${table([
        row("Paciente", esc(patientName)),
        row("Cita", esc(whenLabel)),
        row("Pagó el paciente", formatMxn(amountCents)),
        row("Comisión de Lemy", `− ${formatMxn(lemyFeeCents)}`),
        ...(stripeFeeCents !== null ? [row("Comisión de Stripe", `− ${formatMxn(stripeFeeCents)}`)] : []),
        row("Te quedan", netCents !== null ? `<strong>${formatMxn(netCents)}</strong>` : "Por confirmar en Stripe"),
      ])}
      <p>Stripe deposita el dinero en tu cuenta bancaria${
        expected ? `; estimamos que esté disponible alrededor del <strong>${expected}</strong>` : " en unos días"
      }. Los primeros pagos de una cuenta nueva suelen tardar más. Es normal que todavía no lo veas en tu banco.</p>
      <p>Puedes ver el estado de todos tus cobros (cobrado, en camino o depositado) en la pestaña <strong>Cobros por consulta</strong>.</p>
      ${BUTTON("https://lemy.mx/dashboard?tab=pagos", "Ver mis cobros →")}
    `),
  };
}

export function cardPayoutFailedTherapist(params: { therapistName: string; amountCents: number }) {
  const { therapistName, amountCents } = params;
  return {
    subject: "Stripe no pudo depositarte un pago — revisa tu cuenta bancaria",
    html: wrap(`
      <h1 style="font-size: 21px; margin: 0 0 14px; color: #21382b; font-weight: 600;">Hola, ${esc(therapistName)}</h1>
      <p>Stripe intentó depositar <strong>${formatMxn(amountCents)}</strong> en tu cuenta bancaria y el depósito <strong>no se pudo completar</strong>. Tu dinero no se perdió: Stripe lo conserva hasta que lo corrijas.</p>
      <p>Lo más común es que haya un dato bancario incorrecto o que la cuenta esté cerrada. Revisa tus datos de depósito en Stripe; en cuanto estén bien, Stripe vuelve a intentarlo.</p>
      ${BUTTON("https://lemy.mx/dashboard?tab=pagos", "Ir a Cobros por consulta →")}
    `),
  };
}

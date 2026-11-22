// Etiquetas y colores del estado de un pago con tarjeta (tabla card_payments).
// Se usa en el tablero del terapeuta y en la ficha de admin.

export type CardPaymentStatus = "paid" | "deposited" | "payout_failed" | "refunded";

export function cardPaymentStatusLabel(status: string): string {
  switch (status) {
    case "deposited":
      return "Depositado en tu banco";
    case "payout_failed":
      return "Depósito fallido";
    case "refunded":
      return "Reembolsado";
    default:
      return "Cobrado · en camino a tu banco";
  }
}

// Versión corta para la ficha de admin (habla de "el terapeuta", no "tu").
export function cardPaymentStatusLabelAdmin(status: string): string {
  switch (status) {
    case "deposited":
      return "Depositado";
    case "payout_failed":
      return "Depósito fallido";
    case "refunded":
      return "Reembolsado";
    default:
      return "Cobrado, por depositar";
  }
}

export function cardPaymentStatusClasses(status: string): string {
  switch (status) {
    case "deposited":
      return "border-forest/30 bg-forest/[0.08] text-forest";
    case "payout_failed":
      return "border-rose-deep/40 bg-rose/10 text-rose-deep";
    case "refunded":
      return "border-line bg-card text-[#7C877F]";
    default:
      return "border-line bg-sage-white text-[#3E4B44]";
  }
}

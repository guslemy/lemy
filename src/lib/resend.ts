import { Resend } from "resend";

// Cliente de servidor — nunca importar esto desde un componente de cliente.
// Instanciación perezosa: el constructor de Resend truena si la API key
// viene vacía, y no queremos que el build (o el arranque del servidor)
// falle solo porque RESEND_API_KEY todavía no está configurada.
let _resend: Resend | null = null;

export function getResendClient(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_sin_configurar");
  }
  return _resend;
}

export const NOTIFICATIONS_FROM_EMAIL =
  process.env.NOTIFICATIONS_FROM_EMAIL || "Lemy <notificaciones@lemy.mx>";

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

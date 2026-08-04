import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GoogleLoginButton } from "@/components/google-login-button";
import { EmailAuthForm } from "@/components/email-auth-form";

// Antes esta página tenía su propio estilo hardcodeado (verde azulado y
// crema, sin header/footer del sitio) y un único copy genérico ("Entra a
// Lemy") sin importar de dónde viniera alguien. Se sentía "agresiva" para
// quien solo estaba tratando de confirmar una cita — como si le estuvieran
// pidiendo crear una cuenta de la nada. Ahora usa el mismo sistema visual
// que el resto del sitio, y cuando `next` indica que se llegó desde el flujo
// de reservar (perfil de terapeuta o completar-perfil), el copy se enfoca
// en la cita, no en "crear una cuenta".
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; flujo?: string }>;
}) {
  const { next, flujo } = await searchParams;
  // El perfil del terapeuta ahora vive en la raíz (/[slug]), así que su URL
  // ya no se distingue de cualquier otra ruta del sitio con un startsWith —
  // por eso requestAppointment manda flujo=reserva explícito al redirigir
  // aquí (ver src/app/[slug]/actions.ts).
  const isBookingFlow = Boolean(flujo === "reserva" || next === "/completar-perfil");

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-24">
        <div className="mx-auto max-w-[440px] text-center">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            {isBookingFlow ? "Un último paso" : "Bienvenid@"}
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.2rem]">
            {isBookingFlow ? "Antes de confirmar tu cita" : "Entra a Lemy"}
          </h1>
          <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
            {isBookingFlow
              ? "Solo necesitamos saber que eres tú, para poder guardar tu solicitud y avisarte cuando tu terapeuta la confirme."
              : "Con Google o con tu correo — lo que se te haga más fácil."}
          </p>

          <div className="signature-corner mt-8 flex flex-col items-center gap-5 rounded-[28px] border border-line bg-card p-7">
            <GoogleLoginButton next={next} />
            <p className="max-w-sm text-[0.78rem] text-[#7C877F]">
              Google te va a pedir marcar una casilla para dar acceso a tu Calendar — sin eso no
              vamos a poder crear tus citas automáticamente ahí.
            </p>

            <div className="flex w-full items-center gap-3 text-[0.78rem] text-[#9AA59D]">
              <div className="h-px flex-1 bg-line" />
              o con tu correo
              <div className="h-px flex-1 bg-line" />
            </div>

            <EmailAuthForm next={next} />
          </div>

          <p className="mx-auto mt-6 max-w-sm text-center text-[0.78rem] text-[#7C877F]">
            Al continuar aceptas nuestro{" "}
            <a href="/privacidad" className="underline">
              Aviso de Privacidad
            </a>{" "}
            y{" "}
            <a href="/terminos" className="underline">
              Términos de Uso
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

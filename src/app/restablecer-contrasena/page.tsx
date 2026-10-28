import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = { title: "Nueva contraseña — Lemy", robots: { index: false } };

// Aquí aterriza el link del correo de "¿Olvidaste tu contraseña?" (pasa antes
// por /auth/callback, que crea la sesión). Sin sesión no hay nada que
// restablecer: se manda a pedir el link otra vez.
export default async function RestablecerContrasenaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-24">
        <div className="mx-auto max-w-[440px] text-center">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Tu cuenta
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.2rem]">
            Elige tu contraseña nueva
          </h1>
          <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
            Escríbela dos veces para evitar errores.
          </p>
          <div className="signature-corner mt-8 flex flex-col items-center gap-5 rounded-[28px] border border-line bg-card p-7">
            <ResetPasswordForm />
          </div>
          <p className="mt-6 text-[0.78rem] text-[#7C877F]">
            <Link href="/dashboard" className="underline">
              Cancelar y seguir a mi cuenta
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

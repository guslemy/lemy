import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { closeTherapistAccount, closePatientAccount } from "./actions";
import { THERAPIST_REASONS, PATIENT_REASONS } from "./reasons";

export default async function CerrarCuentaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/dashboard");

  const isTherapist = profile.role === "therapist";
  const reasons = isTherapist ? THERAPIST_REASONS : PATIENT_REASONS;
  const action = isTherapist ? closeTherapistAccount : closePatientAccount;

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[560px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Cerrar cuenta</p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Antes de irte
          </h1>

          {isTherapist ? (
            <div className="mt-5 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-4 text-[0.9rem] text-[#7A3324]">
              <p className="mb-2">
                <strong>Por la NOM-004-SSA3-2012 debes conservar el expediente de tus pacientes por un mínimo de
                5 años.</strong> Tu expediente en Lemy no se conservará por motivos de seguridad, así que
                descárgalo antes de continuar — tu cuenta será eliminada.
              </p>
              <p>Tu perfil dejará de ser visible en el directorio y tu suscripción se cancelará de inmediato.</p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-line bg-card px-5 py-4 text-[0.9rem] text-[#3E4B44]">
              <p>Al cerrar tu cuenta ya no podrás iniciar sesión con ella. Esta acción no se puede deshacer.</p>
            </div>
          )}

          <form action={action} className="mt-8">
            <label className="mb-2 block font-mono text-[0.78rem] uppercase tracking-[0.04em] text-[#5A665F]">
              ¿Por qué cierras tu cuenta?
            </label>
            <select name="reason" required className="input-lemy">
              <option value="">Elige una opción</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <label className="mt-5 flex items-start gap-2.5 text-[0.86rem] text-[#3E4B44]">
              <input type="checkbox" required className="mt-1" />
              Entiendo que esta acción no se puede deshacer.
            </label>

            <button
              type="submit"
              className="mt-6 rounded-full border border-rose-deep px-5 py-2.5 text-[0.88rem] font-semibold text-rose-deep hover:bg-rose-deep hover:text-sage-white"
            >
              Cerrar mi cuenta
            </button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

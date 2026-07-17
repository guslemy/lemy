import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

// Placeholder — "Mis pacientes" todavía no está construido (ficha de cada
// paciente, historial de sesiones, etc.). Existe como página real (no solo
// un link muerto en el header) para que el terapeuta no se encuentre con
// un 404 mientras se construye.
export default async function MisPacientesPage() {
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

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[680px] text-center">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Mis pacientes
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Muy pronto vas a poder ver aquí a tus pacientes
          </h1>
          <p className="mx-auto mt-3.5 max-w-[440px] text-[0.95rem] text-[#3E4B44]">
            Estamos construyendo esta sección: historial de sesiones y ficha de cada paciente.
            Mientras tanto, tus citas siguen en el panel de citas.
          </p>
          <div className="mt-7">
            <Button href="/dashboard/citas" variant="primary">
              Ir a mis citas
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

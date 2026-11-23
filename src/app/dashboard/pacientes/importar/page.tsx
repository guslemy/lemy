import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ImportarClient } from "./importar-client";

// Importa tus pacientes: asistente para cargar la lista de pacientes desde
// otra agenda (AgendaPro u otra). Disponible para todos los terapeutas.
export default async function ImportarPacientesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "therapist") redirect("/dashboard");

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[900px]">
          <Link href="/dashboard/pacientes" className="text-[0.85rem] text-[#7C877F] underline">
            ← Mis pacientes
          </Link>
          <p className="mt-4 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Importa tus pacientes</p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Trae a tus pacientes a Lemy
          </h1>
          <div className="mt-6">
            <ImportarClient />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

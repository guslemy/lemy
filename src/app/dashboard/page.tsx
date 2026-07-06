import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Placeholder del dashboard (terapeuta y paciente comparten ruta por ahora,
// se bifurca por rol una vez que definamos el onboarding).
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-[#0f3d3e]">
        Hola, {profile?.full_name ?? user.email}
      </h1>
      <p className="mt-2 text-neutral-600">
        Rol actual: <strong>{profile?.role ?? "sin definir"}</strong>
      </p>
      <p className="mt-6 text-sm text-neutral-500">
        Aquí vivirá la agenda del terapeuta (citas, disponibilidad) o el historial
        del paciente, según el rol. Siguiente paso del proyecto.
      </p>
    </main>
  );
}

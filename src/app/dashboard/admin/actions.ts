"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin() {
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
  if (profile?.role !== "admin") redirect("/dashboard");

  return { user };
}

// Desactivación reversible (a diferencia del reset masivo de prueba, que sí
// borra todo de verdad) — la cuenta deja de poder entrar (ver auth/callback
// y email-auth-form) pero sus datos siguen intactos por si se reactiva.
export async function deactivateUser(formData: FormData) {
  const { user } = await requireAdmin();
  const targetId = String(formData.get("user_id") || "");
  if (!targetId) redirect("/dashboard/admin?error=1");
  if (targetId === user.id) redirect("/dashboard/admin?error=self");

  const serviceClient = createServiceClient();
  await serviceClient
    .from("profiles")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", targetId);

  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin?desactivado=1");
}

export async function reactivateUser(formData: FormData) {
  await requireAdmin();
  const targetId = String(formData.get("user_id") || "");
  if (!targetId) redirect("/dashboard/admin?error=1");

  const serviceClient = createServiceClient();
  await serviceClient.from("profiles").update({ deactivated_at: null }).eq("id", targetId);

  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin?reactivado=1");
}

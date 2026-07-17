"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/url";

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

  return { supabase, user };
}

export async function addEducationalContent(formData: FormData) {
  const { supabase } = await requireAdmin();

  const title = String(formData.get("title") || "").trim();
  const platform = String(formData.get("platform") || "youtube");
  const url = normalizeUrl(String(formData.get("url") || ""));
  const specialtyIds = formData.getAll("specialties").map(String);

  if (!title || !url || specialtyIds.length === 0) {
    redirect("/dashboard/contenido?error=1");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("educational_content")
    .insert({ title, platform, url })
    .select("id")
    .single();

  if (insertError || !inserted) {
    redirect("/dashboard/contenido?error=1");
  }

  await supabase
    .from("educational_content_specialties")
    .insert(specialtyIds.map((specialty_id) => ({ content_id: inserted.id, specialty_id })));

  revalidatePath("/dashboard/contenido");
  revalidatePath("/buscar");
  redirect("/dashboard/contenido?guardado=1");
}

export async function deleteEducationalContent(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") || "");
  if (id) {
    await supabase.from("educational_content").delete().eq("id", id);
  }

  revalidatePath("/dashboard/contenido");
  revalidatePath("/buscar");
  redirect("/dashboard/contenido?eliminado=1");
}

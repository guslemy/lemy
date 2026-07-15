"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireTherapist() {
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

  return { supabase, user };
}

export async function addAvailabilitySlot(formData: FormData) {
  const { supabase, user } = await requireTherapist();

  const day_of_week = Number(formData.get("day_of_week"));
  const start_time = String(formData.get("start_time") || "");
  const end_time = String(formData.get("end_time") || "");

  if (
    Number.isNaN(day_of_week) ||
    day_of_week < 0 ||
    day_of_week > 6 ||
    !start_time ||
    !end_time ||
    start_time >= end_time
  ) {
    redirect("/dashboard/disponibilidad?error=1");
  }

  await supabase.from("availability_slots").insert({
    therapist_id: user.id,
    day_of_week,
    start_time,
    end_time,
    is_recurring: true,
  });

  revalidatePath("/dashboard/disponibilidad");
  redirect("/dashboard/disponibilidad?guardado=1");
}

export async function deleteAvailabilitySlot(formData: FormData) {
  const { supabase, user } = await requireTherapist();

  const id = String(formData.get("id") || "");
  if (id) {
    await supabase.from("availability_slots").delete().eq("id", id).eq("therapist_id", user.id);
  }

  revalidatePath("/dashboard/disponibilidad");
  redirect("/dashboard/disponibilidad?eliminado=1");
}

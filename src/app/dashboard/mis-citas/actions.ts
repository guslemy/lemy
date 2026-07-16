"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cancelAppointmentAsParticipant } from "@/lib/appointments";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function cancelAppointmentPatient(formData: FormData) {
  const { supabase, user } = await requireUser();
  const appointmentId = String(formData.get("appointment_id") || "");
  const reason = String(formData.get("reason") || "").trim() || null;

  const result = await cancelAppointmentAsParticipant(
    supabase,
    user.id,
    appointmentId,
    "patient",
    reason
  );

  revalidatePath("/dashboard/mis-citas");
  redirect(result.ok ? "/dashboard/mis-citas?cancelado=1" : "/dashboard/mis-citas?error=1");
}

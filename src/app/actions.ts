"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Cerrar sesión, de cara a todo el sitio. Antes no existía ningún botón
// para esto en ningún lado — "Mi cuenta" en el header solo llevaba a
// /dashboard, nunca a la sesión de quien la abrió. Ya se usaba una versión
// idéntica pero acoplada a /resena ([appointmentId]/actions.ts,
// signOutAndRetry) para el caso de "cuenta equivocada" — esta es la
// genérica, de cara a todo el sitio.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

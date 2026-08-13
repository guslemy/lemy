import { redirect } from "next/navigation";

// Antes esta era la página completa de edición de perfil — se movió a la
// pestaña "Editar perfil" de /dashboard (2026-08-14, ver
// src/components/dashboard-tabs/therapist-perfil-tab.tsx). Se deja este
// redirect para que correos ya enviados y bookmarks viejos no den 404.
export default function PerfilRedirect() {
  redirect("/dashboard?tab=perfil");
}

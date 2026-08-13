import { redirect } from "next/navigation";

// Antes esta era la página completa de citas del terapeuta — se movió a la
// pestaña "Citas" de /dashboard (2026-08-14, ver
// src/components/dashboard-tabs/therapist-citas-tab.tsx). citas-client.tsx
// se queda en esta carpeta — el nuevo componente lo importa desde aquí.
export default function CitasRedirect() {
  redirect("/dashboard?tab=citas");
}

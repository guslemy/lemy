import { redirect } from "next/navigation";

// Antes esta era la página completa de disponibilidad — se movió a la
// pestaña "Disponibilidad" de /dashboard (2026-08-14, ver
// src/components/dashboard-tabs/therapist-disponibilidad-tab.tsx).
export default function DisponibilidadRedirect() {
  redirect("/dashboard?tab=disponibilidad");
}

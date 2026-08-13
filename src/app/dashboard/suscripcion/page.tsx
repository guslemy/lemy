import { redirect } from "next/navigation";

// Antes esta era la página completa de suscripción — se movió a la pestaña
// "Suscripción" de /dashboard (2026-08-14, ver
// src/components/dashboard-tabs/therapist-suscripcion-tab.tsx).
export default function SuscripcionRedirect() {
  redirect("/dashboard?tab=suscripcion");
}

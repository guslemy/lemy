import { redirect } from "next/navigation";

// Antes esta era la página completa de "Mis citas" del paciente — se movió
// a la pestaña (única, por ahora) del panel de paciente en /dashboard
// (2026-08-14, ver src/components/dashboard-tabs/patient-mis-citas-tab.tsx).
export default function MisCitasRedirect() {
  redirect("/dashboard?tab=citas");
}

import { redirect } from "next/navigation";

// Antes esta era la página completa de cobros por consulta — se movió a la
// pestaña "Cobros por consulta" de /dashboard (2026-08-14, ver
// src/components/dashboard-tabs/therapist-pagos-tab.tsx).
export default function PagosRedirect() {
  redirect("/dashboard?tab=pagos");
}

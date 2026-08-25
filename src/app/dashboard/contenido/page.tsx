import { redirect } from "next/navigation";

// El panel de contenido se fusionó dentro de /dashboard/admin como una
// pestaña (2026-08-14, ver PanelTabs) — esta ruta se deja como redirect por
// si algún link viejo (marcador, historial del navegador) todavía apunta
// aquí.
export default function ContenidoRedirect() {
  redirect("/dashboard/admin?tab=contenido");
}

// Renombrado a panel-tabs.tsx (PanelTabs) el 2026-08-14 al generalizarse a
// los paneles de terapeuta y paciente, no solo admin. No se pudo borrar
// este archivo por una limitación del entorno de montaje — se deja como
// re-export para no duplicar la implementación. Usa "@/components/panel-tabs"
// en código nuevo.
export { PanelTabs as AdminTabs, type PanelTab as AdminTab } from "@/components/panel-tabs";

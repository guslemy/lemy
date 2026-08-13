"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Pill } from "@/components/ui/pill";

export type PanelTab = { key: string; label: string; content: ReactNode };

// Interruptor de pestañas genérico — usado en el panel de admin, el de
// terapeuta y el de paciente (antes se llamaba AdminTabs, cuando solo lo
// usaba /dashboard/admin; se renombró al generalizarse a los 3 roles,
// 2026-08-14). El server component ya resolvió y renderizó el contenido de
// todas las pestañas de una sola vez — esto son paneles internos con pocos
// datos por cuenta, no vale la pena complicarlo con fetch por pestaña —
// aquí solo se decide cuál mostrar, sin navegar ni recargar.
//
// La URL sí se actualiza (router.replace, sin agregar entradas al historial
// ni hacer scroll-to-top) para que se pueda refrescar, compartir o volver
// con el botón de "atrás" del navegador a la pestaña correcta — pero el
// cambio visible es instantáneo porque no depende de esa navegación, solo
// de useState.
export function PanelTabs({ tabs, initialTabKey }: { tabs: PanelTab[]; initialTabKey: string }) {
  const [activeKey, setActiveKey] = useState(
    tabs.some((t) => t.key === initialTabKey) ? initialTabKey : tabs[0]?.key
  );
  const router = useRouter();
  const pathname = usePathname();
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  function selectTab(key: string) {
    setActiveKey(key);
    router.replace(`${pathname}?tab=${key}`, { scroll: false });
  }

  return (
    <div>
      {/* Con una sola pestaña no hay nada entre qué elegir — mostrar la
          barra igual solo confundiría (un pill solitario, sin función). Se
          usa así hoy en el panel de paciente (solo "Mis citas"), pensado
          para crecer sin tener que rediseñar nada cuando se agreguen más. */}
      {tabs.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2.5">
          {tabs.map((t) => (
            <Pill key={t.key} active={t.key === active?.key} onClick={() => selectTab(t.key)}>
              {t.label}
            </Pill>
          ))}
        </div>
      )}
      {active?.content}
    </div>
  );
}

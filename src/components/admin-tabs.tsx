"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Pill } from "@/components/ui/pill";

export type AdminTab = { key: string; label: string; content: ReactNode };

// Interruptor de pestañas genérico: el server component ya resolvió y
// renderizó el contenido de las 3 pestañas de una sola vez (esto es un
// panel interno con pocos datos, no vale la pena complicarlo con fetch por
// pestaña) — aquí solo se decide cuál mostrar, sin navegar ni recargar.
//
// La URL sí se actualiza (router.replace, sin agregar entradas al historial
// ni hacer scroll-to-top) para que se pueda refrescar, compartir o volver
// con el botón de "atrás" del navegador a la pestaña correcta — pero el
// cambio visible es instantáneo porque no depende de esa navegación, solo
// de useState.
//
// Gustavo pidió este mismo patrón (abrir panel → pestañas → clic cambia
// sin salir de la pantalla) como estilo general para paneles con varias
// secciones — este componente está escrito para poder reusarse en otros
// paneles más adelante, no solo en /dashboard/admin.
export function AdminTabs({ tabs, initialTabKey }: { tabs: AdminTab[]; initialTabKey: string }) {
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
      <div className="mb-8 flex flex-wrap gap-2.5">
        {tabs.map((t) => (
          <Pill key={t.key} active={t.key === active?.key} onClick={() => selectTab(t.key)}>
            {t.label}
          </Pill>
        ))}
      </div>
      {active?.content}
    </div>
  );
}

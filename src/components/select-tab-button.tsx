"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SELECT_TAB_EVENT } from "@/components/panel-tabs";

// Botón que cambia de pestaña del panel al instante (sin recargar la página
// ni volver a pedir todo el dashboard al servidor). Ver panel-tabs.tsx.
export function SelectTabButton({
  tabKey,
  children,
  variant = "primary",
}: {
  tabKey: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "rose" | "outline-light";
}) {
  return (
    <Button
      variant={variant}
      onClick={() => {
        window.dispatchEvent(new CustomEvent(SELECT_TAB_EVENT, { detail: tabKey }));
        // Lleva la vista a las pestañas, que quedan más abajo que el banner.
        document.getElementById("panel-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {children}
    </Button>
  );
}

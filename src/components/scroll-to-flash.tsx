"use client";

import { useEffect } from "react";

// Después de guardar algo en el dashboard (perfil, horarios, etc.), la acción
// del servidor redirige a la misma página con un parámetro como
// ?perfil_guardado=1, y el letrero de "Guardamos tus cambios" aparece ARRIBA
// de la pestaña — pero el navegador conserva la posición de scroll de donde
// estaba el botón de guardar, así que el letrero quedaba fuera de pantalla y
// parecía que no había pasado nada.
//
// Este componente lleva la vista hasta el inicio del panel (donde salen los
// letreros) cada vez que llega una respuesta con algún parámetro de aviso.
// `renderId` cambia en cada render del servidor, para que también funcione si
// se guarda dos veces seguidas (la URL sería idéntica y el efecto no se
// volvería a disparar sin él).
export function ScrollToFlash({ active, renderId }: { active: boolean; renderId: number }) {
  useEffect(() => {
    if (!active) return;
    document.getElementById("panel-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active, renderId]);

  return null;
}

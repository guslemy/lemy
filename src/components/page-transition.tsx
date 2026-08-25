"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

// Transición pareja para TODA la navegación entre páginas (Button y Link ya
// usan next/link en todo el sitio, así que esto los cubre automáticamente
// sin tocar cada botón uno por uno). Un fade corto cada vez que cambia el
// pathname — incluye navegaciones "duras" como /login, donde antes el
// cambio de página se sentía como un corte seco.
//
// Sin librerías externas (mismo criterio que scroll-reveal.tsx): solo
// estado + CSS transitions.
//
// IMPORTANTE — solo animar opacity aquí, nunca transform (translate/scale/
// rotate/skew), ni siquiera "translate-y-0" en reposo: Tailwind convierte
// eso en `transform: translate(...)` real (no el keyword `none`), y
// cualquier ancestro con `transform` se vuelve el "viewport" para sus
// descendientes `position: fixed` (spec CSS, no es un bug del navegador).
// Como este wrapper envuelve TODO el contenido de cada página, cualquier
// modal/banner/pestaña fixed en cualquier parte del sitio queda pegado
// dentro de este contenedor en vez de la ventana real — se ve "atorado" en
// el footer, hay que scrollear para encontrarlo. Ya pasó dos veces
// (QuizFloatingTab, InstallInstructionsModal + el recorte de foto en
// photo-upload-field.tsx) antes de quitar translate-y de aquí; si se quiere
// recuperar el "rise" hay que animarlo con algo que no sea transform (por
// ejemplo margin-top), o portalear cada elemento fixed a document.body.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div
      // flex flex-1 flex-col: el <body> es flex-col (ver layout.tsx) y antes
      // SiteHeader/main/SiteFooter eran hijos directos suyos. Este wrapper
      // se comporta igual dentro de ese flex-col para no romper el layout.
      className={`flex flex-1 flex-col transition-opacity duration-300 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

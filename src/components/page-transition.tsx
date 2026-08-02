"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

// Transición pareja para TODA la navegación entre páginas (Button y Link ya
// usan next/link en todo el sitio, así que esto los cubre automáticamente
// sin tocar cada botón uno por uno). Un fade + rise corto cada vez que
// cambia el pathname — incluye navegaciones "duras" como /login, donde
// antes el cambio de página se sentía como un corte seco.
//
// Sin librerías externas (mismo criterio que scroll-reveal.tsx): solo
// estado + CSS transitions.
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
      className={`flex flex-1 flex-col transition-all duration-300 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

// Entrada secundaria y discreta al cuestionario de match — a propósito NO es
// un popup ni un modal. En un sitio de salud mental, algo que aparece encima
// de la pantalla sin pedirlo se siente invasivo justo para quien llega con
// más fragilidad. Esta es una pestañita fija en el borde, visible pero
// ignorable, para quien todavía no ha decidido usar el buscador directo.
//
// Se monta con un portal a document.body en vez de renderizarse en el lugar
// donde se usa (dentro de cada página, que a su vez vive dentro de
// PageTransition). PageTransition anima con translate-y-*, y Tailwind
// convierte eso en un `transform` real (incluso en translate-y-0) — un
// ancestro con `transform` se vuelve el "viewport" para cualquier
// descendiente `position: fixed`, así que sin el portal esta pestañita
// quedaba fija dentro del contenedor de la página (se veía pegada al
// footer, no a la ventana del navegador). Con el portal escapa de ese
// ancestro y `fixed` vuelve a ser relativo a la ventana de verdad.
export function QuizFloatingTab() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Un portal solo puede montarse del lado del cliente, después de que
    // document.body exista — no se puede calcular durante el render en el
    // servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ver comentario arriba
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <Link
      href="/test"
      className="animate-tab-attention fixed bottom-6 right-0 z-40 flex items-center gap-2 rounded-l-full border border-r-0 border-line bg-card py-3 pl-4.5 pr-5 text-[0.85rem] font-semibold text-forest shadow-[var(--shadow-signature)] transition-all duration-200 hover:border-rose-deep hover:bg-rose-deep hover:pr-6 hover:text-white"
    >
      <span aria-hidden>✦</span>
      ¿No sabes por dónde empezar?
    </Link>,
    document.body
  );
}

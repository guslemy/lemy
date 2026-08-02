"use client";

import { useEffect } from "react";

// Bug reportado: parado en /login, al darle "Atrás" el navegador cambia la
// URL a algo como /#perfil (una ancla de la home) pero la página se queda
// donde estaba — no hace scroll hacia esa sección. Pasa porque "Atrás"
// hacia una URL que solo cambia el hash es un evento popstate, y el router
// de Next (App Router) no siempre re-dispara el scroll-into-view en ese
// caso. Este listener lo fuerza a mano, en toda la app, para cualquier
// ancla (#perfil, #agenda, #confianza, etc.).
export function HashScrollFix() {
  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return;
      const el = document.getElementById(hash.slice(1));
      if (!el) return;
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    window.addEventListener("popstate", scrollToHash);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      window.removeEventListener("popstate", scrollToHash);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, []);

  return null;
}

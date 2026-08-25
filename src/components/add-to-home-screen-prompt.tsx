"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const DISMISSED_KEY = "lemy_a2hs_dismissed_at";
const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// iOS solo manda notificaciones push a sitios agregados a la pantalla de
// inicio (PWA instalada) — una pestaña normal de Safari nunca las recibe,
// sin importar qué tan bien esté armado el manifest. Este aviso es el
// primer paso para que la gente instale Lemy; el push en sí (service
// worker, permiso, VAPID, canal nuevo en notifications/engine.ts) queda
// para después, ver [[project_lemy_pwa_add_to_home_screen]].
//
// Solo vive dentro de /dashboard (donde importa de verdad recibir avisos
// de citas/reseñas) — se auto-filtra por pathname en vez de necesitar un
// layout aparte para esa sección.
export function AddToHomeScreenPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    if (!isIOS) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error -- propiedad no estándar, solo existe en Safari/iOS
      window.navigator.standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (Date.now() - dismissedAt < REMIND_AFTER_MS) return;

    // El chequeo depende de APIs que solo existen en el navegador
    // (matchMedia, navigator.userAgent, localStorage) y del pathname real
    // ya montado — no hay forma de calcularlo durante el render inicial sin
    // arriesgar un mismatch de hidratación entre servidor y cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, [pathname]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 px-4 pb-6 sm:items-center">
      <div className="signature-corner w-full max-w-[420px] rounded-[28px] border border-line bg-card p-7 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-deep/10 text-rose-deep">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="mt-4 font-display text-[1.35rem] text-forest">
          Agrega Lemy a tu pantalla de inicio
        </h2>
        <p className="mt-2.5 text-[0.88rem] text-[#3E4B44]">
          En iPhone, los avisos de citas y mensajes solo llegan si Lemy está instalado así — toma
          unos segundos y no te vuelves a perder una solicitud.
        </p>

        <ol className="mt-6 space-y-3 text-left text-[0.88rem] text-[#3E4B44]">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/[0.08] font-mono text-[0.75rem] text-forest">
              1
            </span>
            <span>
              Toca el botón <strong>Compartir</strong> (el cuadrito con la flecha hacia arriba) en la
              barra de Safari.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/[0.08] font-mono text-[0.75rem] text-forest">
              2
            </span>
            <span>
              Desplázate y toca <strong>Agregar a pantalla de inicio</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/[0.08] font-mono text-[0.75rem] text-forest">
              3
            </span>
            <span>
              Toca <strong>Agregar</strong> arriba a la derecha.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/[0.08] font-mono text-[0.75rem] text-forest">
              4
            </span>
            <span>
              La próxima vez, abre Lemy desde ese ícono en tu pantalla de inicio, no desde Safari.
            </span>
          </li>
        </ol>

        <button
          type="button"
          onClick={dismiss}
          className="mt-7 w-full rounded-full border border-forest px-6 py-2.5 text-[0.9rem] font-semibold text-forest transition-colors hover:bg-forest hover:text-sage-white"
        >
          Recordarme después
        </button>
        <p className="mt-3 text-[0.75rem] text-[#8B978F]">
          ¿Se te complicó? Escríbenos a{" "}
          <a href="mailto:hola@lemy.mx" className="underline">
            hola@lemy.mx
          </a>
        </p>
      </div>
    </div>
  );
}

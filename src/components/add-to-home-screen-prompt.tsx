"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { InstallInstructionsModal } from "@/components/install-instructions-modal";

const DISMISSED_KEY = "lemy_a2hs_dismissed_at";
const REMIND_AFTER_MS = 24 * 60 * 60 * 1000; // 1 día

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
//
// El contenido del modal en sí vive en InstallInstructionsModal — este
// componente solo decide CUÁNDO aparece solo. Quien lo cierre puede volver
// a abrirlo manualmente desde InstallAppButton (siempre visible en el
// header de /dashboard), sin esperar el cooldown.
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

  return <InstallInstructionsModal onDismiss={dismiss} />;
}

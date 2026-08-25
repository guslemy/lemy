"use client";

import { useEffect, useState } from "react";
import { InstallInstructionsModal } from "@/components/install-instructions-modal";
import { isIOSDevice, isStandaloneDisplay } from "@/lib/push-client";

// Chrome/Edge/Samsung Internet (Android y escritorio) disparan este evento
// cuando el sitio cumple los requisitos de instalación (manifest + service
// worker) — lib.dom.d.ts todavía no lo tipa, así que lo definimos a mano.
// Firefox y Safari de escritorio no lo soportan (no hay atajo ahí, solo
// queda decirle a la persona que use Chrome/Edge si quiere instalar).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Botón permanente para instalar Lemy como app — visible siempre en el
// header de /dashboard (a diferencia de AddToHomeScreenPrompt y
// EnableNotificationsPrompt, que aparecen solos y luego se pueden quedar
// "escondidos" hasta que pase el cooldown). Nace de un pedido concreto de
// Gustavo: durante una prueba cerró el aviso de iPhone y no encontró forma
// de volver a verlo sin borrar datos del sitio en Safari.
//
// Se adapta según el navegador:
// - iOS (Safari y cualquier otro, todos comparten WebKit): no hay API de
//   instalación de un clic, así que el botón abre las instrucciones
//   manuales (mismo modal que el aviso automático).
// - Chrome/Edge/Samsung Internet (Android o escritorio): captura el evento
//   beforeinstallprompt y dispara el diálogo nativo del navegador con un
//   clic.
// - Ya instalado, o navegador sin ninguna de las dos rutas (Firefox, Safari
//   de escritorio): no muestra nada, no hay nada útil que ofrecer.
export function InstallAppButton() {
  const [standalone, setStandalone] = useState(true); // true por defecto: no mostrar nada hasta confirmar que hace falta
  const [iOSModalOpen, setIOSModalOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de matchMedia/navigator, no calculable en el servidor
    setStandalone(isStandaloneDisplay());

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setStandalone(true);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;

  async function handleChromiumInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
  }

  const label = (
    <>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Instalar Lemy
    </>
  );

  const buttonClass =
    "flex items-center gap-2 rounded-full border border-line bg-card py-1.5 px-3 text-[0.8rem] font-medium text-forest";

  if (isIOSDevice()) {
    return (
      <>
        <button type="button" onClick={() => setIOSModalOpen(true)} className={buttonClass}>
          {label}
        </button>
        {iOSModalOpen && <InstallInstructionsModal onDismiss={() => setIOSModalOpen(false)} />}
      </>
    );
  }

  if (installEvent) {
    return (
      <button type="button" onClick={handleChromiumInstall} className={buttonClass}>
        {label}
      </button>
    );
  }

  return null;
}

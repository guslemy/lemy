"use client";

import { useEffect, useState } from "react";

// Cuando Lemy corre instalada como app (display: "standalone" en
// manifest.ts — "Agregar a pantalla de inicio"), no hay ninguna barra de
// navegador alrededor: sin barra de direcciones, sin flechas de
// atrás/adelante. Dentro de una pestaña normal del navegador esto no hace
// falta (el navegador ya las trae), así que solo se muestra en modo
// standalone — mismo chequeo que ya usa AddToHomeScreenPrompt.
function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error -- propiedad no estándar, solo existe en Safari/iOS
      window.navigator.standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(standalone);
  }, []);

  return isStandalone;
}

// No hay forma confiable de saber por adelantado si "atrás" o "adelante"
// de verdad van a mover a alguna parte (el navegador no expone eso) — igual
// que las flechas de un navegador real en los extremos de su historial,
// simplemente no hacen nada si no hay a dónde ir. Mejor eso que esconder el
// botón por completo.
export function PwaNavButtons() {
  const isStandalone = useIsStandalone();
  if (!isStandalone) return null;

  return (
    <div className="flex items-center gap-1 pr-1">
      <button
        type="button"
        aria-label="Atrás"
        onClick={() => window.history.back()}
        className="flex h-8 w-8 items-center justify-center rounded-full text-forest transition-colors hover:bg-forest/[0.08]"
      >
        <ChevronIcon direction="left" />
      </button>
      <button
        type="button"
        aria-label="Adelante"
        onClick={() => window.history.forward()}
        className="flex h-8 w-8 items-center justify-center rounded-full text-forest transition-colors hover:bg-forest/[0.08]"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

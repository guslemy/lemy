"use client";

import { useState } from "react";

// Input de solo lectura con el link + botón "Copiar" — usado para el link
// de referidos en el dashboard del terapeuta. navigator.clipboard requiere
// "use client"; no hay forma de hacer esto desde un Server Component.
export function CopyLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Algunos navegadores bloquean el portapapeles fuera de HTTPS/gesto
      // directo del usuario — el input sigue ahí para copiar a mano.
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2.5">
      <input
        type="text"
        readOnly
        value={link}
        onFocus={(e) => e.target.select()}
        className="input-lemy min-w-[240px] flex-1 text-[0.85rem]"
      />
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-sage-white transition-all duration-200 active:scale-95 hover:bg-forest-deep"
      >
        {copied ? "¡Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}

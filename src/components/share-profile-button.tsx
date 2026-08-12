"use client";

import { useState } from "react";
import { InstagramIcon, FacebookIcon, TikTokIcon, WhatsAppIcon } from "@/components/social-icons";

// Botón "Compartir perfil" en el perfil público del terapeuta — para que el
// propio terapeuta (o un paciente recomendándolo) lo mande por WhatsApp, lo
// publique en Facebook, o copie el link para pegarlo en Instagram/TikTok.
// Instagram y TikTok no tienen una URL de "compartir" real como WhatsApp o
// Facebook (no aceptan un link+texto prellenado desde la web) — para esas
// dos, la única opción real es copiar el link y que la persona lo pegue a
// mano en su bio o historia.
export function ShareProfileButton({
  profileUrl,
  therapistName,
}: {
  profileUrl: string;
  therapistName: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = `Mira el perfil de ${therapistName} en Lemy:`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${profileUrl}`)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles — el link sigue visible abajo para
      // copiarlo a mano.
    }
  }

  async function handleClick() {
    // En móvil, si el navegador soporta el share nativo, es la mejor
    // experiencia (usa el propio menú del sistema) — el popup con las
    // opciones de abajo queda como respaldo para desktop o navegadores sin
    // soporte.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: therapistName, text: shareText, url: profileUrl });
        return;
      } catch {
        // Si canceló el share nativo o falló, mostramos el popup normal.
      }
    }
    setOpen(true);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-sage-white px-5 py-2.5 text-sm font-semibold text-forest transition-all duration-200 hover:border-forest active:scale-95"
      >
        Compartir perfil
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-deep/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="signature-corner w-full max-w-[360px] rounded-[24px] border border-line bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[1.1rem] text-forest">Compartir perfil</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#8B978F] hover:text-forest"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-line px-4 py-2.5 text-[0.9rem] text-forest transition-colors hover:border-forest"
              >
                <WhatsAppIcon /> WhatsApp
              </a>
              <a
                href={facebookHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-line px-4 py-2.5 text-[0.9rem] text-forest transition-colors hover:border-forest"
              >
                <FacebookIcon /> Facebook
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="flex w-full items-center gap-3 rounded-2xl border border-line px-4 py-2.5 text-left text-[0.9rem] text-forest transition-colors hover:border-forest"
              >
                <InstagramIcon />
                <TikTokIcon />
                {copied ? "¡Copiado! Pégalo en tu bio o historia" : "Copiar link para Instagram / TikTok"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

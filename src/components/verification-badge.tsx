"use client";

import { useState } from "react";

// Explicación de por qué existe la verificación — se muestra en un globo al
// pasar el puntero (desktop) o dar clic (touch) sobre el badge de texto
// ("Cédula verificada" / "Perfil no verificado", arriba de la foto en el
// perfil público) o sobre el sello azul (ver VerificationSeal más abajo,
// estilo Instagram/Meta, sobre la foto en tarjetas y en esta misma página).
const VERIFICATION_EXPLANATION =
  "En Lemy nos importa tu seguridad. Por eso pedimos a las y los terapeutas que se verifiquen con nosotros — así te damos más garantía sobre la calidad de tus consultas.";

function Tooltip({ open, align = "center" }: { open: boolean; align?: "center" | "right" }) {
  if (!open) return null;
  return (
    <div
      role="tooltip"
      onClick={(e) => e.stopPropagation()}
      className={`absolute top-full z-20 mt-2 w-[230px] rounded-2xl border border-line bg-card p-3 text-left text-[0.78rem] leading-snug text-[#3E4B44] shadow-[var(--shadow-signature)] ${
        align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
      }`}
    >
      {VERIFICATION_EXPLANATION}
    </div>
  );
}

// Pill de texto con el estado de verificación (ambos estados, a diferencia
// del sello azul que solo aparece si está verificado). Vive arriba de la
// foto en /[slug].
export function VerificationBadge({ verified }: { verified: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          verified
            ? "inline-flex items-center gap-1.5 rounded-full bg-forest/[0.08] px-3 py-1 font-mono text-[0.72rem] text-forest"
            : "inline-flex items-center gap-1.5 rounded-full bg-[#8B978F]/10 px-3 py-1 font-mono text-[0.72rem] text-[#7C877F]"
        }
      >
        {verified ? "✓ Cédula verificada" : "Perfil no verificado"}
      </button>
      <Tooltip open={open} />
    </span>
  );
}

const SIZES = {
  sm: { badge: "h-5 w-5", icon: 11 },
  md: { badge: "h-6 w-6", icon: 13 },
} as const;

// Sello azul estilo Instagram/Meta — solo se renderiza cuando el terapeuta
// está verificado (a diferencia de VerificationBadge, que sí muestra ambos
// estados). Se superpone en la esquina de la foto de perfil circular; el
// contenedor de la foto debe tener className="relative". Vive en /[slug],
// en las tarjetas de la home (DirectoryPreview) y en /buscar (TherapistCard).
export function VerificationSeal({
  size = "sm",
  className = "",
  tooltipAlign = "center",
}: {
  size?: "sm" | "md";
  className?: string;
  tooltipAlign?: "center" | "right";
}) {
  const [open, setOpen] = useState(false);
  const { badge, icon } = SIZES[size];

  return (
    <span
      className={`absolute z-10 ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Terapeuta verificado por Lemy"
        className={`flex ${badge} items-center justify-center rounded-full bg-[#3B82F6] text-white ring-2 ring-white`}
      >
        <svg viewBox="0 0 20 20" width={icon} height={icon} fill="none" aria-hidden="true">
          <path
            d="M4.5 10.5l3.5 3.5L15.5 6"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <Tooltip open={open} align={tooltipAlign} />
    </span>
  );
}

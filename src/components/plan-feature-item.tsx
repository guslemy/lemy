"use client";

import { useState } from "react";
import type { PlanFeature } from "@/lib/plan-features";

// Cada beneficio del plan es clickeable — abre un popup con el detalle
// (feature.detail, ver lib/plan-features.ts). Mismo patrón de modal
// centrado que ya se usa en el resto del panel (PatientInfoPopup,
// ShareProfileButton), para que se sienta consistente.
export function PlanFeatureItem({ feature }: { feature: PlanFeature }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="flex gap-2">
      <span className="text-forest">✓</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left underline decoration-forest/25 underline-offset-2 hover:decoration-forest"
      >
        {feature.label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-deep/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="signature-corner w-full max-w-[380px] rounded-[24px] border border-line bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[1.05rem] text-forest">{feature.label}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-none text-[#8B978F] hover:text-forest"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <p className="mt-3 text-[0.9rem] leading-relaxed text-[#3E4B44]">{feature.detail}</p>
          </div>
        </div>
      )}
    </li>
  );
}

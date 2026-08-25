"use client";

import { useState } from "react";

// Selector de estrellas para /resena/[appointmentId]. Es "use client" solo
// por la interacción (hover/click) — el valor real viaja en un <input
// type="hidden"> dentro del <form action={...}> del server component
// padre, así que sigue siendo una Server Action normal la que procesa el
// envío, no una llamada a API aparte.
export function StarRatingInput({ name = "rating" }: { name?: string }) {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);
  const shown = hovered || selected;

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      <div className="flex gap-1.5" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} de 5 estrellas`}
            onClick={() => setSelected(n)}
            onMouseEnter={() => setHovered(n)}
            className={`text-[2rem] leading-none transition-colors ${
              n <= shown ? "text-rose-deep" : "text-line"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

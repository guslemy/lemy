"use client";

import { useState } from "react";

// El <input type="file"> nativo se ve como texto plano, no como algo
// clickeable — varios terapeutas reportaron que no sabían cómo subir su
// foto. Esto lo envuelve en una zona con borde punteado, ícono y texto que
// se lee como botón, y muestra el nombre del archivo elegido para dar
// confirmación visual inmediata (antes no había ninguna señal de que sí se
// había seleccionado algo).
export function PhotoUploadField() {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <label
      htmlFor="photo-upload-input"
      className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-line px-5 py-4 transition-colors hover:border-forest hover:bg-forest/[0.03]"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="flex-none text-forest"
        aria-hidden="true"
      >
        <path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" strokeLinecap="round" />
        <path d="M12 15V3" strokeLinecap="round" />
        <path d="M7.5 7.5 12 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>
        <span className="block text-[0.9rem] font-medium text-forest">
          {fileName ?? "Elegir foto…"}
        </span>
        <span className="block text-[0.78rem] text-[#7C877F]">
          {fileName ? "Click para cambiarla" : "JPG o PNG, máximo 5 MB"}
        </span>
      </span>
      <input
        id="photo-upload-input"
        type="file"
        name="photo"
        accept="image/*"
        required
        className="sr-only"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </label>
  );
}

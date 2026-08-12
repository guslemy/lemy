"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { cropImageToFile } from "@/lib/crop-image";

// Antes esto era solo un <input type="file"> disfrazado — subía la foto tal
// cual, sin poder ajustarla. Gustavo pidió algo tipo Facebook: elegir la
// foto abre un editor donde puedes arrastrar para reposicionarla y usar un
// slider para hacer zoom, todo dentro de un círculo que muestra justo cómo
// se va a ver en el sitio. Al confirmar, se recorta a un cuadrado con
// canvas (ver lib/crop-image.ts) y ESE archivo (nunca la foto original) es
// el que se manda en el <input type="file"> real que el form ya esperaba —
// así no hubo que tocar uploadTherapistPhoto ni el resto del formulario.
export function PhotoUploadField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRawSrc(URL.createObjectURL(file));
  }

  function cancelCrop() {
    if (rawSrc) URL.revokeObjectURL(rawSrc);
    setRawSrc(null);
    // Sin foto ya confirmada antes, deja el input vacío para no mandar la
    // foto sin recortar por accidente.
    if (!previewSrc && inputRef.current) inputRef.current.value = "";
  }

  async function confirmCrop() {
    if (!rawSrc || !croppedAreaPixels) return;
    setWorking(true);
    setCropError(null);
    try {
      const file = await cropImageToFile(rawSrc, croppedAreaPixels);
      const dt = new DataTransfer();
      dt.items.add(file);
      if (inputRef.current) inputRef.current.files = dt.files;
      setPreviewSrc(URL.createObjectURL(file));
      URL.revokeObjectURL(rawSrc);
      setRawSrc(null);
    } catch {
      setCropError("No se pudo recortar esa imagen. Intenta con otra.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        id="photo-upload-input"
        type="file"
        name="photo"
        accept="image/*"
        className="sr-only"
        onChange={handlePick}
      />

      {!rawSrc && (
        <label
          htmlFor="photo-upload-input"
          className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-line px-5 py-4 transition-colors hover:border-forest hover:bg-forest/[0.03]"
        >
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="" className="h-11 w-11 flex-none rounded-full object-cover" />
          ) : (
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
          )}
          <span>
            <span className="block text-[0.9rem] font-medium text-forest">
              {previewSrc ? "Foto lista" : "Elegir foto…"}
            </span>
            <span className="block text-[0.78rem] text-[#7C877F]">
              {previewSrc ? "Click para elegir y recortar otra" : "JPG o PNG, máximo 5 MB"}
            </span>
          </span>
        </label>
      )}

      {cropError && <p className="mt-2 text-[0.82rem] text-rose-deep">{cropError}</p>}

      {rawSrc && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-forest-deep/70 px-4 py-8">
          <div className="w-full max-w-[420px]">
            <p className="mb-3 text-center text-[0.9rem] font-medium text-sage-white">
              Ajusta tu foto — arrastra para mover, usa el control para acercar
            </p>
            <div className="relative h-[340px] w-full overflow-hidden rounded-[24px] bg-black">
              <Cropper
                image={rawSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, Number((z - 0.1).toFixed(2))))}
                aria-label="Alejar"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/15 text-lg text-sage-white hover:bg-white/25"
              >
                −
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-rose"
                aria-label="Zoom"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
                aria-label="Acercar"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/15 text-lg text-sage-white hover:bg-white/25"
              >
                +
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelCrop}
                className="rounded-full border border-white/30 px-5 py-2 text-[0.88rem] font-medium text-sage-white hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                disabled={working}
                className="rounded-full bg-rose-deep px-5 py-2 text-[0.88rem] font-semibold text-white hover:bg-[#a86356] disabled:opacity-60"
              >
                {working ? "Un momento…" : "Usar esta foto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

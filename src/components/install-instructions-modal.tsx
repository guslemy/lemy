// Modal puramente presentacional — las instrucciones para agregar Lemy a la
// pantalla de inicio en iPhone (Safari no soporta el `beforeinstallprompt`
// nativo que sí existe en Chrome/Edge/Samsung Internet, así que aquí no hay
// atajo de un clic: hay que explicar los pasos manuales).
//
// Separado de AddToHomeScreenPrompt (que decide CUÁNDO aparece solo, con
// cooldown) para poder reusarlo también desde un botón permanente
// (InstallAppButton) que cualquiera puede abrir cuando quiera, sin esperar
// a que vuelva a aparecer solo — Gustavo pidió esto después de dismissear el
// aviso durante una prueba y no encontrar cómo volver a verlo.
export function InstallInstructionsModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 px-4 pb-6 sm:items-center">
      <div className="signature-corner w-full max-w-[420px] rounded-[28px] border border-line bg-card p-7 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-deep/10 text-rose-deep">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="mt-4 font-display text-[1.35rem] text-forest">
          Agrega Lemy a tu pantalla de inicio
        </h2>
        <p className="mt-2.5 text-[0.88rem] text-[#3E4B44]">
          En iPhone, los avisos de citas y mensajes solo llegan si Lemy está instalado así — toma
          unos segundos y no te vuelves a perder una solicitud.
        </p>

        <ol className="mt-6 space-y-3 text-left text-[0.88rem] text-[#3E4B44]">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/[0.08] font-mono text-[0.75rem] text-forest">
              1
            </span>
            <span>
              Toca el botón <strong>Compartir</strong> (el cuadrito con la flecha hacia arriba) en tu
              navegador.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/[0.08] font-mono text-[0.75rem] text-forest">
              2
            </span>
            <span>
              Desplázate y toca <strong>Agregar a pantalla de inicio</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/[0.08] font-mono text-[0.75rem] text-forest">
              3
            </span>
            <span>
              Toca <strong>Agregar</strong> arriba a la derecha.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/[0.08] font-mono text-[0.75rem] text-forest">
              4
            </span>
            <span>
              La próxima vez, abre Lemy desde ese ícono en tu pantalla de inicio, no desde el
              navegador.
            </span>
          </li>
        </ol>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-7 w-full rounded-full border border-forest px-6 py-2.5 text-[0.9rem] font-semibold text-forest transition-colors hover:bg-forest hover:text-sage-white"
        >
          Entendido
        </button>
        <p className="mt-3 text-[0.75rem] text-[#8B978F]">
          ¿Se te complicó? Escríbenos a{" "}
          <a href="mailto:hola@lemy.mx" className="underline">
            hola@lemy.mx
          </a>
        </p>
      </div>
    </div>
  );
}

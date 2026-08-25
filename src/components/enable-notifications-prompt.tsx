"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { pushSupported, isIOSDevice, isStandaloneDisplay, subscribeToPush } from "@/lib/push-client";
import { savePushSubscription } from "@/app/push/actions";

const DISMISSED_KEY = "lemy_push_dismissed_at";
const REMIND_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 días

// Banner discreto (no modal a pantalla completa como AddToHomeScreenPrompt
// — pedir permiso del navegador es un paso más ligero, no hace falta
// bloquear toda la pantalla) para activar Web Push. Solo vive en
// /dashboard, igual que el aviso de instalar.
//
// En iOS, Web Push solo funciona si el sitio ya está instalado en pantalla
// de inicio (modo standalone) — por eso este componente se queda callado
// en iOS hasta que eso pase; AddToHomeScreenPrompt es quien empuja ese
// primer paso.
export function EnableNotificationsPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "denied" | "error">("idle");

  useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return;
    if (!pushSupported()) return;
    if (isIOSDevice() && !isStandaloneDisplay()) return;
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "denied") return;

    if (Notification.permission === "granted") {
      // Ya había dado permiso antes — solo nos aseguramos de que la
      // suscripción siga guardada (idempotente, no molesta con UI).
      subscribeToPush(savePushSubscription);
      return;
    }

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (Date.now() - dismissedAt < REMIND_AFTER_MS) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de APIs de navegador (Notification, matchMedia) que no existen durante el render en el servidor
    setVisible(true);
  }, [pathname]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }

  async function activate() {
    setStatus("loading");
    const result = await subscribeToPush(savePushSubscription);
    if (result.ok) {
      setStatus("done");
      setTimeout(() => setVisible(false), 2000);
    } else if (result.reason === "denied") {
      setStatus("denied");
    } else {
      setStatus("error");
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-[420px] sm:right-4 sm:left-auto">
      <div className="signature-corner rounded-[24px] border border-line bg-card p-5 shadow-lg">
        {status === "done" ? (
          <p className="text-[0.9rem] text-forest">Listo — te avisaremos por aquí.</p>
        ) : status === "denied" ? (
          <p className="text-[0.85rem] text-[#3E4B44]">
            Quedaron bloqueadas desde el navegador. Puedes activarlas más tarde desde los ajustes de
            notificaciones de tu navegador o celular.
          </p>
        ) : (
          <>
            <p className="text-[0.9rem] font-medium text-forest">Activa tus notificaciones</p>
            <p className="mt-1 text-[0.82rem] text-[#3E4B44]">
              Entérate al instante de nuevas solicitudes de cita, recordatorios y reseñas.
            </p>
            <div className="mt-3.5 flex gap-2.5">
              <button
                type="button"
                onClick={activate}
                disabled={status === "loading"}
                className="rounded-full bg-forest px-4 py-2 text-[0.82rem] font-semibold text-sage-white transition-colors hover:bg-forest-deep disabled:opacity-60"
              >
                {status === "loading" ? "Activando…" : "Activar"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full px-4 py-2 text-[0.82rem] font-medium text-[#7C877F] hover:text-forest"
              >
                Ahora no
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

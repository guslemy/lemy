"use client";

import { useState } from "react";
import { setPushEnabled } from "@/app/push/actions";

// Interruptor de notificaciones a nivel cuenta, visible siempre en la
// cabecera de /dashboard (fuera de PanelTabs, mismo patrón que "Ver mi
// perfil público" e "Invita y ahorra") — no depende de en qué pestaña esté
// parado terapeuta o paciente. Independiente del banner
// EnableNotificationsPrompt (ese pide permiso del navegador la primera vez
// en cada dispositivo); este toggle es el kill switch de la cuenta,
// aplica a todos los dispositivos de una vez vía profiles.push_enabled.
export function NotificationsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !enabled;
    setEnabled(next); // optimista — se revierte si falla
    setPending(true);
    const result = await setPushEnabled(next);
    if (!result.ok) setEnabled(!next);
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={enabled}
      className="flex items-center gap-2 rounded-full border border-line bg-card py-1.5 pl-3 pr-2.5 text-[0.8rem] font-medium text-forest transition-opacity disabled:opacity-60"
    >
      <span aria-hidden>🔔</span>
      Notificaciones
      <span
        className={`relative inline-block h-[17px] w-[30px] shrink-0 rounded-full transition-colors ${
          enabled ? "bg-forest" : "bg-[#D8D3C4]"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[13px] w-[13px] rounded-full bg-white transition-all ${
            enabled ? "right-[2px]" : "left-[2px]"
          }`}
        />
      </span>
    </button>
  );
}

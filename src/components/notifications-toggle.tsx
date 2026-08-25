"use client";

import { useState, type ReactNode } from "react";
import { setPushEnabled, setEmailWhatsappEnabled } from "@/app/push/actions";
import { BellIcon, MailIcon } from "@/components/social-icons";

// Interruptores de notificaciones a nivel cuenta, visibles siempre en la
// cabecera de /dashboard (fuera de PanelTabs, mismo patrón que "Ver mi
// perfil público" e "Invita y ahorra") — no dependen de en qué pestaña esté
// parado terapeuta o paciente.
//
// Son dos, separados a propósito (Gustavo, 2026-08-25): uno para push
// (independiente del banner EnableNotificationsPrompt, que solo pide el
// permiso del navegador la primera vez en cada dispositivo — este toggle es
// el kill switch de la cuenta completa, profiles.push_enabled) y otro para
// correo + WhatsApp (profiles.email_whatsapp_enabled, no afecta los avisos
// esenciales del ciclo de vida de una cita — ver ESSENTIAL_EMAIL_WHATSAPP_TYPES
// en lib/notifications/engine.ts). Apagar uno no apaga el otro.
function NotificationToggle({
  label,
  icon,
  initialEnabled,
  action,
}: {
  label: string;
  icon: ReactNode;
  initialEnabled: boolean;
  action: (enabled: boolean) => Promise<{ ok: boolean }>;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !enabled;
    setEnabled(next); // optimista — se revierte si falla
    setPending(true);
    const result = await action(next);
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
      {icon}
      {label}
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

export function NotificationsToggles({
  initialPushEnabled,
  initialEmailWhatsappEnabled,
}: {
  initialPushEnabled: boolean;
  initialEmailWhatsappEnabled: boolean;
}) {
  return (
    <>
      <NotificationToggle
        label="Avisos instantáneos"
        icon={<BellIcon />}
        initialEnabled={initialPushEnabled}
        action={setPushEnabled}
      />
      <NotificationToggle
        label="Correo y WhatsApp"
        icon={<MailIcon />}
        initialEnabled={initialEmailWhatsappEnabled}
        action={setEmailWhatsappEnabled}
      />
    </>
  );
}

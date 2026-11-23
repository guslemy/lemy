"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SELECT_TAB_EVENT } from "@/components/panel-tabs";

// Aviso al entrar al panel: el perfil del terapeuta no es público porque no
// tiene plan (la prueba terminó) y/o porque aún no está verificado. Se muestra
// UNA VEZ AL DÍA (día calendario de Ciudad de México) para generar presión sin
// estorbar en cada cambio de pestaña, y lleva directo a lo que falta.
const STORAGE_KEY = "lemy_profile_hidden_dialog_day";

function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }); // YYYY-MM-DD
}

export function ProfileHiddenDialog({ needsPlan, needsVerification }: { needsPlan: boolean; needsVerification: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === todayKey()) return;
    } catch {
      // Sin acceso a localStorage: se muestra igual.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de localStorage, que solo existe en el navegador
    setOpen(true);
  }, []);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      // ignorar
    }
    setOpen(false);
  };

  const goToTab = (tab: string) => {
    window.dispatchEvent(new CustomEvent(SELECT_TAB_EVENT, { detail: tab }));
    document.getElementById("panel-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    close();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-hidden-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-forest-deep/50 px-4"
      onClick={close}
    >
      <div
        className="w-full max-w-[420px] rounded-[24px] border border-line bg-sage-white p-7 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="profile-hidden-title" className="font-display text-[1.4rem] font-medium text-forest">
          Tu perfil no es público
        </h2>
        {needsPlan ? (
          <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
            Tu perfil de terapeuta no es público. Adquiere un plan para comenzar a recibir a tus pacientes.
          </p>
        ) : (
          <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
            Tu perfil de terapeuta no es público porque aún no está verificado. Sube tus documentos para que lo revisemos y
            puedas recibir a tus pacientes.
          </p>
        )}
        {needsPlan && needsVerification && (
          <p className="mt-2 text-[0.85rem] text-[#7C877F]">
            Además, para que se muestre necesitas verificar tu cédula profesional.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2.5">
          {needsPlan && (
            <Button type="button" variant="primary" className="w-full" onClick={() => goToTab("suscripcion")}>
              Ver planes
            </Button>
          )}
          {needsVerification && (
            <Button
              type="button"
              variant={needsPlan ? "ghost" : "primary"}
              className="w-full"
              onClick={() => goToTab("perfil")}
            >
              Verificar mi cuenta
            </Button>
          )}
          <button type="button" onClick={close} className="cursor-pointer text-[0.85rem] text-[#7C877F] underline">
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}

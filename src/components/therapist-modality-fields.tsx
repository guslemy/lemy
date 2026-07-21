"use client";

import { useState } from "react";

// El campo de dirección completa solo tiene sentido si "presencial" está
// marcado — se oculta el resto del tiempo para no confundir a quien solo
// atiende en línea. La dirección exacta nunca se muestra en el perfil
// público (ver terapeuta/[slug]/page.tsx): solo colonia/ciudad son
// públicas, la dirección completa se revela al paciente tras reservar.
export function ModalityFields({
  initialOnline,
  initialInPerson,
  initialAddress,
}: {
  initialOnline: boolean;
  initialInPerson: boolean;
  initialAddress: string;
}) {
  const [inPerson, setInPerson] = useState(initialInPerson);

  return (
    <div className="mt-4 space-y-3">
      <label className="flex items-center gap-2.5 text-[0.9rem] text-[#3E4B44]">
        <input
          type="checkbox"
          name="is_online_available"
          defaultChecked={initialOnline}
          className="h-4 w-4 accent-forest"
        />
        Atiendo sesiones en línea
      </label>

      <label className="flex items-center gap-2.5 text-[0.9rem] text-[#3E4B44]">
        <input
          type="checkbox"
          name="is_in_person_available"
          checked={inPerson}
          onChange={(e) => setInPerson(e.target.checked)}
          className="h-4 w-4 accent-forest"
        />
        Atiendo sesiones presenciales
      </label>

      {inPerson && (
        <label className="block pt-1.5">
          <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">
            Dirección completa del consultorio
          </span>
          <input
            name="address"
            defaultValue={initialAddress}
            placeholder="Calle, número, colonia, referencias…"
            className="input-lemy"
          />
          <span className="mt-1 block text-[0.78rem] text-[#7C877F]">
            No se muestra en tu perfil público — solo se la damos al paciente cuando confirmas su
            cita, y aparece en la invitación de calendario.
          </span>
        </label>
      )}
    </div>
  );
}

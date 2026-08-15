"use client";

import { useState } from "react";
import { DURACIONES_SERVICIO } from "@/lib/perfil-catalogos";

export type ServiceCatalogItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
};

export type ServiceSelection = {
  serviceId: string;
  price: number;
  durationMin: number;
};

// Catálogo fijo (migración 0031) — el terapeuta marca cuáles ofrece y le
// pone precio + duración a cada uno. A diferencia de las especialidades/
// enfoques (checkboxes simples), aquí cada fila marcada necesita 2 datos
// más, así que los campos de precio/duración usan un nombre por id de
// servicio (price_<id> / duration_<id>) en vez del patrón de arreglos
// paralelos que usan posgrado/formación continua — con un catálogo fijo y
// acotado (10 servicios) no hace falta indexar por posición.
export function TherapistServicesFields({
  catalog,
  initialSelections,
}: {
  catalog: ServiceCatalogItem[];
  initialSelections: ServiceSelection[];
}) {
  const initialMap = new Map(initialSelections.map((s) => [s.serviceId, s]));
  const [checked, setChecked] = useState<Set<string>>(new Set(initialMap.keys()));
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {catalog.map((service) => {
        const isChecked = checked.has(service.id);
        const initial = initialMap.get(service.id);
        return (
          <div
            key={service.id}
            className={`rounded-2xl border p-4 transition-colors duration-150 ${
              isChecked ? "border-forest/40 bg-forest/[0.03]" : "border-line"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-[0.9rem] font-medium text-forest">
                <input
                  type="checkbox"
                  name="service_ids"
                  value={service.id}
                  checked={isChecked}
                  onChange={() => toggle(service.id)}
                  className="h-4 w-4 accent-forest"
                />
                {service.nombre}
              </label>
              {service.descripcion && (
                <button
                  type="button"
                  onClick={() => setOpenInfo(openInfo === service.id ? null : service.id)}
                  className="font-mono text-[0.72rem] text-[#8B978F] underline decoration-dotted hover:text-forest"
                >
                  {openInfo === service.id ? "Ocultar" : "¿Qué incluye?"}
                </button>
              )}
            </div>

            {openInfo === service.id && service.descripcion && (
              <p className="mt-2 text-[0.82rem] text-[#7C877F]">{service.descripcion}</p>
            )}

            {isChecked && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[0.78rem] font-medium text-forest">
                    Precio (MXN)
                  </span>
                  <input
                    type="number"
                    name={`price_${service.id}`}
                    min={1}
                    defaultValue={initial?.price ?? ""}
                    required
                    className="input-lemy"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[0.78rem] font-medium text-forest">Duración</span>
                  <select
                    name={`duration_${service.id}`}
                    defaultValue={initial?.durationMin ?? 45}
                    className="input-lemy"
                  >
                    {DURACIONES_SERVICIO.map((d) => (
                      <option key={d} value={d}>
                        {d} minutos
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Pill, Tag } from "@/components/ui/pill";

// Antes esto era una lista de 6 terapeutas de ejemplo (Mariana Torres, Diego
// Fernández, etc.) fija en el código — nunca reflejaba altas ni cambios
// reales. Ahora recibe terapeutas de verdad, ya resueltos server-side en
// page.tsx (misma fuente que /buscar), y solo se encarga del filtro
// instantáneo por categoría en el cliente.
export type DirectoryTherapist = {
  slug: string;
  display_name: string;
  tagline: string | null;
  city: string | null;
  price_min: number | null;
  price_max: number | null;
  is_online_available: boolean;
  is_in_person_available: boolean;
  photo_url: string | null;
  specialtySlugs: string[];
  specialtyNames: string[];
};

// Mismos slugs reales de la tabla specialties (ver 0002_seed_catalogos.sql /
// 0011_specialidades_cuestionario.sql) — "adolescentes" no existe como
// especialidad propia (es un client_niche), así que aquí usamos "familia"
// en su lugar para que la pill sí filtre algo real.
const CATEGORIES = [
  { value: "todos", label: "Todos" },
  { value: "ansiedad", label: "Ansiedad" },
  { value: "pareja", label: "Pareja" },
  { value: "duelo", label: "Duelo" },
  { value: "autoestima", label: "Autoestima" },
  { value: "familia", label: "Familia" },
  { value: "trauma", label: "Trauma" },
];

const GRADIENTS = [
  "linear-gradient(135deg,#3E6B54,var(--forest))",
  "linear-gradient(135deg,var(--rose),var(--rose-deep))",
  "linear-gradient(135deg,#B99433,#8E7124)",
];

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function priceLabel(min: number | null, max: number | null) {
  if (min) return `desde $${Math.round(min)} MXN`;
  if (max) return `hasta $${Math.round(max)} MXN`;
  return "Tarifa a consultar";
}

export function DirectoryPreview({ therapists }: { therapists: DirectoryTherapist[] }) {
  const [active, setActive] = useState("todos");
  const visible =
    active === "todos" ? therapists : therapists.filter((t) => t.specialtySlugs.includes(active));

  // Solo mostramos las pills de categorías que de verdad tienen a alguien
  // detrás — una pill que siempre da 0 resultados se siente rota, no vacía.
  const availableCategories = CATEGORIES.filter(
    (c) => c.value === "todos" || therapists.some((t) => t.specialtySlugs.includes(c.value))
  );

  return (
    <div>
      <div className="mb-9 flex flex-wrap gap-2.5">
        {availableCategories.map((c) => (
          <Pill key={c.value} active={active === c.value} onClick={() => setActive(c.value)}>
            {c.label}
          </Pill>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="signature-corner rounded-[28px] border border-line bg-card p-10 text-center">
          <p className="font-display text-[1.15rem] text-forest">Nada por aquí todavía con ese filtro</p>
          <p className="mx-auto mt-2 max-w-[420px] text-[0.9rem] text-[#42504A]">
            Prueba con otra categoría, o revisa el directorio completo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t, i) => (
            <Link
              key={t.slug}
              href={`/${t.slug}`}
              className="signature-corner rounded-[28px] border border-line bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)]"
            >
              {t.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.photo_url} alt="" className="mb-4 h-14 w-14 rounded-full object-cover" />
              ) : (
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-full font-display text-lg font-semibold text-white"
                  style={{ background: GRADIENTS[i % GRADIENTS.length] }}
                >
                  {initialsFrom(t.display_name)}
                </div>
              )}
              <h3 className="font-display text-[1.12rem] text-forest">{t.display_name}</h3>
              {t.tagline && <p className="mt-0.5 font-mono text-[0.86rem] text-rose-deep">{t.tagline}</p>}
              {t.tagline ? null : (
                <p className="mt-0.5 font-mono text-[0.86rem] text-rose-deep">
                  {t.specialtyNames.slice(0, 1).join("")}
                </p>
              )}
              <p className="mt-3 text-[0.9rem] text-[#42504A]">
                {t.city ?? (t.is_online_available ? "En línea" : "")}
              </p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {t.is_online_available && <Tag>Online</Tag>}
                {t.is_in_person_available && <Tag>Presencial</Tag>}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="text-[0.85rem] text-[#42504A]">
                  {priceLabel(t.price_min, t.price_max)}
                </span>
                <span className="text-[0.85rem] font-semibold text-forest">Ver perfil →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-9 text-center">
        <Link href="/buscar" className="text-[0.9rem] font-semibold text-forest hover:text-rose-deep">
          Ver directorio completo →
        </Link>
      </div>
    </div>
  );
}

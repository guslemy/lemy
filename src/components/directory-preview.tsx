"use client";

import { useState } from "react";
import { Pill, Tag } from "@/components/ui/pill";

// Datos de ejemplo para mostrar cómo se ve el directorio — no son terapeutas
// reales. El buscador funcional de verdad, con datos de Supabase, vive en /buscar.
const CATEGORIES = [
  { value: "todos", label: "Todos" },
  { value: "ansiedad", label: "Ansiedad" },
  { value: "pareja", label: "Pareja" },
  { value: "duelo", label: "Duelo" },
  { value: "autoestima", label: "Autoestima" },
  { value: "adolescentes", label: "Adolescentes" },
  { value: "trauma", label: "Trauma" },
];

const THERAPISTS = [
  {
    cat: "ansiedad",
    initials: "MT",
    gradient: "linear-gradient(135deg,#3E6B54,var(--forest))",
    name: "Mariana Torres",
    role: "Ansiedad y estrés",
    desc: "Terapia cognitivo-conductual para adultos que buscan herramientas concretas.",
    tags: ["Online", "Adultos"],
    price: "desde $600 MXN",
  },
  {
    cat: "pareja",
    initials: "DF",
    gradient: "linear-gradient(135deg,var(--rose),var(--rose-deep))",
    name: "Diego Fernández",
    role: "Terapia de pareja",
    desc: "Enfoque sistémico para mejorar comunicación y resolver conflictos recurrentes.",
    tags: ["Presencial", "Online"],
    price: "desde $750 MXN",
  },
  {
    cat: "duelo",
    initials: "VR",
    gradient: "linear-gradient(135deg,#B99433,#8E7124)",
    name: "Valentina Ruiz",
    role: "Duelo y pérdida",
    desc: "Acompañamiento humanista para procesos de pérdida y transiciones difíciles.",
    tags: ["Online", "Adultos"],
    price: "desde $650 MXN",
  },
  {
    cat: "adolescentes",
    initials: "AM",
    gradient: "linear-gradient(135deg,#3E6B54,var(--forest))",
    name: "Andrés Molina",
    role: "Adolescentes y familia",
    desc: "Especialista en dinámicas familiares y desarrollo en la adolescencia.",
    tags: ["Presencial", "Familia"],
    price: "desde $700 MXN",
  },
  {
    cat: "autoestima",
    initials: "CH",
    gradient: "linear-gradient(135deg,var(--rose),var(--rose-deep))",
    name: "Camila Herrera",
    role: "Autoestima y autoconocimiento",
    desc: "Trabajo desde la autocompasión para adultos jóvenes en transición de vida.",
    tags: ["Online", "Adultos jóvenes"],
    price: "desde $600 MXN",
  },
  {
    cat: "trauma",
    initials: "SR",
    gradient: "linear-gradient(135deg,#B99433,#8E7124)",
    name: "Santiago Reyes",
    role: "Trauma y estrés postraumático",
    desc: "Enfoque especializado con técnicas somáticas para experiencias difíciles.",
    tags: ["Online", "Presencial"],
    price: "desde $800 MXN",
  },
];

export function DirectoryPreview() {
  const [active, setActive] = useState("todos");
  const visible =
    active === "todos" ? THERAPISTS : THERAPISTS.filter((t) => t.cat === active);

  return (
    <div>
      <div className="mb-9 flex flex-wrap gap-2.5">
        {CATEGORIES.map((c) => (
          <Pill key={c.value} active={active === c.value} onClick={() => setActive(c.value)}>
            {c.label}
          </Pill>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t) => (
          <div
            key={t.name}
            className="signature-corner rounded-[28px] border border-line bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)]"
          >
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-full font-display text-lg font-semibold text-white"
              style={{ background: t.gradient }}
            >
              {t.initials}
            </div>
            <h3 className="font-display text-[1.12rem] text-forest">{t.name}</h3>
            <p className="mt-0.5 font-mono text-[0.86rem] text-rose-deep">{t.role}</p>
            <p className="mt-3 text-[0.9rem] text-[#42504A]">{t.desc}</p>
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {t.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <span className="text-[0.85rem] text-[#42504A]">{t.price}</span>
              <a href="#perfil" className="text-[0.85rem] font-semibold text-forest hover:text-rose-deep">
                Ver perfil →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

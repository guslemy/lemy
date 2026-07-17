"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/pill";
import {
  rankTherapists,
  type GeneroPreferido,
  type MatchTherapist,
  type Modalidad,
  type ParaQuien,
  type QuizAnswers,
} from "@/lib/questionnaire";

// Todo el cuestionario vive en memoria de este componente. Nada se guarda en
// Supabase ni se manda a analytics — al cerrar la pestaña, desaparece. Por
// diseño explícito: no queremos pedirle datos a nadie que llega buscando
// ayuda, y así tampoco hay ningún dato de salud "identificable" que proteger.

type Step = "intro" | 0 | 1 | 2 | 3 | 4 | "resultados";

const TOTAL_PREGUNTAS = 5;

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

// Cuando hay `description`, esa frase (empática, en lenguaje cotidiano) es
// el texto grande y clicable; la etiqueta corta (a veces más clínica, como
// "Maltrato o violencia" o "Neurodivergencia") baja de tamaño a una
// etiqueta secundaria. Así nadie necesita conocer el término exacto para
// reconocerse, y nadie tiene que "aceptar" una etiqueta incómoda solo para
// dar clic — puede reconocerse en cómo se siente, no en cómo se llama.
function OptionButton({
  label,
  description,
  onClick,
  selected = false,
}: {
  label: string;
  description?: string;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-6 py-4 text-left transition-all duration-200 active:scale-[0.98] ${
        selected
          ? "border-forest bg-forest text-sage-white"
          : "border-line bg-card text-ink hover:-translate-y-0.5 hover:border-forest hover:shadow-[var(--shadow-signature)]"
      }`}
    >
      {description ? (
        <>
          <span className="block text-[0.96rem] leading-snug">{description}</span>
          <span
            className={`mt-2 block font-mono text-[0.7rem] uppercase tracking-[0.08em] ${
              selected ? "text-sage-white/70" : "text-rose-deep"
            }`}
          >
            {label}
          </span>
        </>
      ) : (
        <span className="text-[1rem]">{label}</span>
      )}
    </button>
  );
}

export function QuizClient({
  specialties,
  therapists,
}: {
  specialties: { slug: string; nombre_coloquial: string; descripcion_coloquial: string | null }[];
  therapists: MatchTherapist[];
}) {
  const [step, setStep] = useState<Step>("intro");
  const [paraQuien, setParaQuien] = useState<ParaQuien | null>(null);
  const [modalidad, setModalidad] = useState<Modalidad | null>(null);
  const [generoPreferido, setGeneroPreferido] = useState<GeneroPreferido | null>(null);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [primeraVez, setPrimeraVez] = useState<boolean | null>(null);

  const progresoIndex = typeof step === "number" ? step : 0;

  function toggleMotivo(slug: string) {
    setMotivos((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function reiniciar() {
    setStep("intro");
    setParaQuien(null);
    setModalidad(null);
    setGeneroPreferido(null);
    setMotivos([]);
    setPrimeraVez(null);
  }

  const answers: QuizAnswers | null =
    paraQuien && modalidad && generoPreferido && primeraVez !== null
      ? { paraQuien, modalidad, generoPreferido, motivos, primeraVez }
      : null;

  const resultados = answers ? rankTherapists(therapists, answers, 3) : [];

  return (
    <section className="px-6 py-16 sm:px-8 md:py-20">
      <div className="mx-auto max-w-[680px]">
        {step !== "intro" && step !== "resultados" && (
          <div className="mb-8">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-rose-deep transition-all duration-300"
                style={{ width: `${((progresoIndex + 1) / TOTAL_PREGUNTAS) * 100}%` }}
              />
            </div>
            <p className="mt-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-[#5A665F]">
              Pregunta {progresoIndex + 1} de {TOTAL_PREGUNTAS}
            </p>
          </div>
        )}

        {step === "intro" && (
          <div key="intro" className="animate-step-in text-center">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
              Encuentra tu conexión
            </p>
            <h1 className="mt-2.5 font-display text-[1.9rem] font-medium leading-[1.15] text-forest sm:text-[2.3rem]">
              Encontremos a quien te pueda escuchar
            </h1>
            <p className="mx-auto mt-4 max-w-[480px] text-[1.02rem] text-[#3E4B44]">
              No es un examen ni hay respuestas correctas. Son 5 preguntitas rápidas para conocerte
              un poco y mostrarte quién te puede acompañar mejor.
            </p>
            <p className="mx-auto mt-2.5 max-w-[480px] text-[0.9rem] text-[#5A665F]">
              No necesitas crear cuenta ni darnos tu correo. Nadie más ve lo que respondas aquí.
            </p>
            <Button onClick={() => setStep(0)} variant="primary" className="mt-8">
              Empezar
            </Button>
          </div>
        )}

        {step === 0 && (
          <div key="step-0" className="animate-step-in">
            <h2 className="font-display text-[1.4rem] text-forest">¿Para quién estamos buscando?</h2>
            <div className="mt-6 space-y-3">
              <OptionButton
                label="Para mí"
                selected={paraQuien === "yo"}
                onClick={() => {
                  setParaQuien("yo");
                  setStep(1);
                }}
              />
              <OptionButton
                label="Para un(a) adolescente"
                selected={paraQuien === "adolescente"}
                onClick={() => {
                  setParaQuien("adolescente");
                  setStep(1);
                }}
              />
              <OptionButton
                label="Para un(a) niño(a)"
                selected={paraQuien === "nino"}
                onClick={() => {
                  setParaQuien("nino");
                  setStep(1);
                }}
              />
              <OptionButton
                label="Para alguien más de mi familia"
                selected={paraQuien === "familiar"}
                onClick={() => {
                  setParaQuien("familiar");
                  setStep(1);
                }}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div key="step-1" className="animate-step-in">
            <h2 className="font-display text-[1.4rem] text-forest">¿Cómo te imaginas tus sesiones?</h2>
            <div className="mt-6 space-y-3">
              <OptionButton
                label="Prefiero ir en persona"
                selected={modalidad === "presencial"}
                onClick={() => {
                  setModalidad("presencial");
                  setStep(2);
                }}
              />
              <OptionButton
                label="Prefiero que sea en línea"
                selected={modalidad === "online"}
                onClick={() => {
                  setModalidad("online");
                  setStep(2);
                }}
              />
              <OptionButton
                label="Cualquiera de las dos está bien"
                selected={modalidad === "cualquiera"}
                onClick={() => {
                  setModalidad("cualquiera");
                  setStep(2);
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="mt-6 text-[0.85rem] font-medium text-forest hover:text-rose-deep"
            >
              ← Regresar
            </button>
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className="animate-step-in">
            <h2 className="font-display text-[1.4rem] text-forest">
              ¿Con quién te sentirías con más confianza?
            </h2>
            <div className="mt-6 space-y-3">
              <OptionButton
                label="Con una mujer"
                selected={generoPreferido === "mujer"}
                onClick={() => {
                  setGeneroPreferido("mujer");
                  setStep(3);
                }}
              />
              <OptionButton
                label="Con un hombre"
                selected={generoPreferido === "hombre"}
                onClick={() => {
                  setGeneroPreferido("hombre");
                  setStep(3);
                }}
              />
              <OptionButton
                label="No tengo preferencia"
                selected={generoPreferido === "sin_preferencia"}
                onClick={() => {
                  setGeneroPreferido("sin_preferencia");
                  setStep(3);
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-6 text-[0.85rem] font-medium text-forest hover:text-rose-deep"
            >
              ← Regresar
            </button>
          </div>
        )}

        {step === 3 && (
          <div key="step-3" className="animate-step-in">
            <h2 className="font-display text-[1.4rem] text-forest">¿Qué te gustaría trabajar?</h2>
            <p className="mt-1.5 text-[0.9rem] text-[#5A665F]">
              Elige las que se parezcan a lo que sientes o vives, puede ser más de una. No necesitas
              saber el nombre exacto.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {specialties.map((s) => (
                <OptionButton
                  key={s.slug}
                  label={s.nombre_coloquial}
                  description={s.descripcion_coloquial ?? s.nombre_coloquial}
                  selected={motivos.includes(s.slug)}
                  onClick={() => toggleMotivo(s.slug)}
                />
              ))}
              <OptionButton
                label="Otra"
                description="Otra cosa, o todavía no estoy seguro(a)"
                selected={motivos.includes("otro")}
                onClick={() => toggleMotivo("otro")}
              />
            </div>
            <div className="mt-7 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-[0.85rem] font-medium text-forest hover:text-rose-deep"
              >
                ← Regresar
              </button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setStep(4)}
                className={motivos.length === 0 ? "pointer-events-none opacity-40" : ""}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div key="step-4" className="animate-step-in">
            <h2 className="font-display text-[1.4rem] text-forest">
              ¿Es la primera vez que buscas ayuda de este tipo?
            </h2>
            <div className="mt-6 space-y-3">
              <OptionButton
                label="Sí, es mi primera vez"
                selected={primeraVez === true}
                onClick={() => {
                  setPrimeraVez(true);
                  setStep("resultados");
                }}
              />
              <OptionButton
                label="No, ya he ido a terapia antes"
                selected={primeraVez === false}
                onClick={() => {
                  setPrimeraVez(false);
                  setStep("resultados");
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="mt-6 text-[0.85rem] font-medium text-forest hover:text-rose-deep"
            >
              ← Regresar
            </button>
          </div>
        )}

        {step === "resultados" && (
          <div key="resultados" className="animate-step-in">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
              Tus resultados
            </p>
            <h2 className="mt-2.5 font-display text-[1.5rem] text-forest">
              {primeraVez
                ? "Dar este paso ya es muchísimo. Aquí tienes algunas personas que podrían acompañarte bien:"
                : "Con base en lo que nos compartiste, esta gente se parece a lo que buscas:"}
            </h2>

            {resultados.length === 0 ? (
              <div className="signature-corner mt-8 rounded-[28px] border border-line bg-card p-10 text-center">
                <p className="font-display text-[1.2rem] text-forest">
                  Todavía no tenemos una opción ideal por aquí
                </p>
                <p className="mx-auto mt-2.5 max-w-[420px] text-[0.92rem] text-[#42504A]">
                  Seguimos sumando terapeutas verificados en Oaxaca. Puedes ver el directorio
                  completo mientras tanto.
                </p>
                <Button href="/buscar" variant="primary" className="mt-6">
                  Ver directorio completo
                </Button>
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {resultados.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/terapeuta/${t.slug}`}
                    className="signature-corner flex flex-col gap-4 rounded-[24px] border border-line bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)] sm:flex-row sm:items-center"
                  >
                    <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-gradient-to-br from-rose to-rose-deep font-display text-lg font-semibold text-white">
                      {initialsFrom(t.display_name)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-[1.08rem] text-forest">{t.display_name}</h3>
                      {t.tagline && <p className="mt-0.5 font-mono text-[0.84rem] text-rose-deep">{t.tagline}</p>}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {t.is_online_available && <Tag>Online</Tag>}
                        {t.specialtyNames.slice(0, 2).map((s) => (
                          <Tag key={s}>{s}</Tag>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-none flex-col items-start gap-1 sm:items-end">
                      <span className="text-[0.85rem] text-[#42504A]">
                        {priceLabel(t.price_min, t.price_max)}
                      </span>
                      <span className="text-[0.85rem] font-semibold text-forest">Ver perfil →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <p className="mx-auto mt-9 max-w-[480px] text-center text-[0.85rem] text-[#5A665F]">
              Esto es solo una guía para ayudarte a elegir, no un diagnóstico ni una evaluación
              clínica.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3.5">
              <Button onClick={reiniciar} variant="ghost">
                Volver a responder
              </Button>
              <Button href="/buscar" variant="primary">
                Ver directorio completo
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

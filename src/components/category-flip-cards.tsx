"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// "Explora por motivo": cada tarjeta tiene dos caras. Cada 2 segundos una
// tarjeta se voltea (efecto 3D) para mostrar la cara de atrás.
//
// Orden pedido por Gustavo (2026-10-09). Numerando las tarjetas
// [1-2-3 | 4-5-6], voltean en el orden 4, 2, 6, 1, 5, 3 — y como cada paso
// alterna la tarjeta (frente <-> reverso), a los 12 pasos todo vuelve al
// inicio y el ciclo se repite sin saltos.
const FLIP_ORDER = [3, 1, 5, 0, 4, 2]; // índices base 0 de 4, 2, 6, 1, 5, 3
const FLIP_INTERVAL_MS = 2000;

const CATEGORIES = [
  {
    eyebrow: "Emocional",
    title: "Ansiedad y estrés",
    body: "Herramientas para regular el día a día y entender de dónde viene.",
    backEyebrow: "Te puede sonar familiar si…",
    back: "Te cuesta soltar la mente, sientes el pecho apretado o vives en alerta aunque “todo esté bien”.",
    query: "ansiedad",
  },
  {
    eyebrow: "Vínculos",
    title: "Terapia de pareja",
    body: "Comunicación, conflictos recurrentes y reconstruir la confianza.",
    backEyebrow: "Puedes trabajar…",
    back: "Discusiones que se repiten, silencios que pesan o la sensación de que ya no están en el mismo equipo.",
    query: "pareja",
  },
  {
    eyebrow: "Procesos",
    title: "Duelo y pérdida",
    body: "Acompañamiento para procesar una pérdida a tu propio ritmo.",
    backEyebrow: "Aquí cabe…",
    back: "Una muerte, una ruptura o un cambio de vida. No hay un tiempo correcto para sentirlo.",
    query: "duelo",
  },
  {
    eyebrow: "Personal",
    title: "Autoestima",
    body: "Reconstruir la relación contigo mism@ desde un lugar más amable.",
    backEyebrow: "Se trata de…",
    back: "Aprender a hablarte con la misma amabilidad con la que le hablarías a alguien que quieres.",
    query: "autoestima",
  },
  {
    eyebrow: "Familia",
    title: "Adolescentes y familia",
    body: "Especialistas en dinámicas familiares y desarrollo adolescente.",
    backEyebrow: "Incluye…",
    back: "Cambios, límites y comunicación en casa: un espacio para ellos y orientación para madres, padres y cuidadores.",
    query: "adolescentes",
  },
  {
    eyebrow: "Especializado",
    title: "Trauma",
    body: "Abordajes específicos para experiencias difíciles del pasado.",
    backEyebrow: "Con cuidado, a tu ritmo",
    back: "Lo que pasó sigue haciendo ruido. Se trabaja sin prisa y sin obligarte a contarlo todo de una vez.",
    query: "trauma",
  },
];

export function CategoryFlipCards() {
  const [flipped, setFlipped] = useState<boolean[]>(() => CATEGORIES.map(() => false));
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [step, setStep] = useState(0);

  // Quien pidió "reducir movimiento" en su sistema no ve nada voltearse sin
  // que lo pida: las tarjetas se quedan estáticas, con el frente visible.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = window.setInterval(() => setStep((s) => s + 1), FLIP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion]);

  // Cada vez que `step` avanza, se voltea la tarjeta que toca en el orden.
  const [lastStep, setLastStep] = useState(0);
  if (step !== lastStep) {
    setLastStep(step);
    const target = FLIP_ORDER[(step - 1) % FLIP_ORDER.length];
    setFlipped((prev) => prev.map((v, i) => (i === target ? !v : v)));
  }

  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      // Pausa mientras el cursor o el dedo están encima — para poder leer
      // y hacer clic sin que la tarjeta se voltee en medio del gesto.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {CATEGORIES.map((cat, i) => {
        const isFlipped = flipped[i];
        return (
          <Link
            key={cat.title}
            href={isFlipped ? `/buscar?q=${encodeURIComponent(cat.query)}` : "#directorio"}
            className="group block [perspective:1200px]"
          >
            <div
              className="relative grid transition-transform duration-[900ms] ease-[cubic-bezier(0.4,0.2,0.2,1)] [transform-style:preserve-3d]"
              style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              {/* Frente */}
              <div
                aria-hidden={isFlipped}
                className={`col-start-1 row-start-1 rounded-[18px] border border-line p-6 [backface-visibility:hidden] ${
                  i % 2 === 1 ? "bg-forest/[0.04]" : "bg-card"
                }`}
              >
                <p className="font-mono text-[0.7rem] tracking-[0.08em] text-rose-deep">{cat.eyebrow}</p>
                <h3 className="mt-2 text-[1.2rem] text-forest">{cat.title}</h3>
                <p className="mt-1.5 text-[0.88rem] text-[#4A564F]">{cat.body}</p>
              </div>

              {/* Reverso */}
              <div
                aria-hidden={!isFlipped}
                className="col-start-1 row-start-1 flex flex-col rounded-[18px] border border-forest bg-forest p-6 shadow-[var(--shadow-signature)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
              >
                <p className="font-mono text-[0.7rem] tracking-[0.08em] text-rose">{cat.backEyebrow}</p>
                <p className="mt-2 text-[0.95rem] leading-snug text-sage-white/90">{cat.back}</p>
                <p className="mt-auto pt-3 text-[0.82rem] font-semibold text-rose">Ver terapeutas →</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

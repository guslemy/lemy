import type { SVGProps } from "react";

// Mismo estilo de línea que photo-upload-field.tsx (stroke=currentColor,
// strokeWidth 1.6, sin relleno) para que /enfoques se sienta parte del
// mismo sistema visual, no un set de íconos importado de otro lado. Cada
// ícono es una metáfora simple del enfoque, no una ilustración literal.
type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    viewBox: "0 0 24 24",
    width: 26,
    height: 26,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

// Cognitivo-conductual: un pensamiento (globo) que se vuelve una acción
// concreta (una palomita) — la idea central del enfoque.
function CognitivoConductual(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H10l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="m8 10 2 2 4-4" />
    </svg>
  );
}

// Psicodinámico: una espiral — mirar hacia adentro y hacia atrás.
function Psicodinamica(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 12.2c0-1.3 1.1-2.3 2.3-2.3s2.3 1 2.3 2.3-1.1 2.3-2.3 2.3-2.8-.9-2.8-2.8 1.3-3.7 3.7-3.7 4.6 1.9 4.6 4.6-2.1 5.5-5.5 5.5-6.4-2.7-6.4-6.4 3-7.3 7.3-7.3" />
    </svg>
  );
}

// Sistémico: nodos conectados — la persona dentro de su red de relaciones.
function Sistemica(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="6" cy="6.5" r="2.1" />
      <circle cx="18" cy="6.5" r="2.1" />
      <circle cx="12" cy="18" r="2.1" />
      <path d="M7.6 8 10.6 16M16.4 8 13.4 16M8.1 6.5h7.8" />
    </svg>
  );
}

// Humanista: un sol — calidez y acompañamiento sin juicio.
function Humanista(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4.3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.7 5.7l1.7 1.7M16.6 16.6l1.7 1.7M5.7 18.3l1.7-1.7M16.6 7.4l1.7-1.7" />
    </svg>
  );
}

// Gestalt: dos círculos que se traslapan — el todo es más que la suma de
// sus partes, y hace eco del isotipo de la marca.
function Gestalt(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9.3" cy="12" r="6" />
      <circle cx="14.7" cy="12" r="6" />
    </svg>
  );
}

// EMDR: un ojo con una línea de zig-zag — el movimiento ocular que da
// nombre a la técnica.
function Emdr(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.2 12s3.9-5.8 9.8-5.8 9.8 5.8 9.8 5.8-3.9 5.8-9.8 5.8S2.2 12 2.2 12Z" />
      <circle cx="12" cy="12" r="2.3" />
    </svg>
  );
}

const ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  "cognitivo-conductual": CognitivoConductual,
  psicodinamica: Psicodinamica,
  sistemica: Sistemica,
  humanista: Humanista,
  gestalt: Gestalt,
  emdr: Emdr,
};

function Default(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export function ApproachIcon({ slug, ...props }: { slug: string } & IconProps) {
  const Icon = ICONS[slug] ?? Default;
  return <Icon {...props} />;
}

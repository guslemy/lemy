// Generador determinista de "portadas" abstractas con la línea gráfica de
// Lemy — los mismos dos círculos con mix-blend-mode: multiply que usa el
// isotipo real (ver hero-orbs.tsx y el logo del footer), en vez de fotos de
// stock o íconos genéricos. Se usa para las portadas de artículos del blog,
// y como respaldo de thumbnail para videos de redes sociales sin miniatura.
//
// Es determinista (mismo seed → siempre el mismo resultado): así el
// artículo o video X siempre se ve igual entre visitas, sin necesitar
// guardar nada en la base de datos ni usar Math.random() (que rompería la
// hidratación de React entre servidor y cliente).

export type BrandCoverSpec = {
  background: string;
  circles: { cx: number; cy: number; r: number; fill: string; blend?: boolean }[];
  // Formas grandes y difuminadas detrás de los círculos nítidos — dan la
  // sensación de una foto/textura de fondo (como pidió Gustavo) sin
  // necesitar una imagen real. Mismo trío de colores que las circles, solo
  // que más grandes, más suaves y con blur.
  bgBlobs: { cx: number; cy: number; r: number; fill: string }[];
};

const PALETTE = {
  forest: "#1e3a2e",
  forestDeep: "#132720",
  rose: "#e3b7ac",
  roseDeep: "#c1786a",
  sageWhite: "#f2f5ef",
  card: "#fbfaf5",
};

function hashSeed(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  return Math.abs(h);
}

// Seis composiciones ya diseñadas a mano (no posiciones aleatorias sueltas)
// para que, sin importar qué seed caiga en cuál, el resultado siempre se
// sienta "de la marca" y no como un patrón genérico.
const COMPOSITIONS: ((jitter: number) => BrandCoverSpec)[] = [
  (j) => ({
    background: PALETTE.sageWhite,
    bgBlobs: [
      { cx: 90, cy: 60, r: 150, fill: PALETTE.rose },
      { cx: 320, cy: 210, r: 170, fill: PALETTE.forest },
    ],
    circles: [
      { cx: 150 + j, cy: 125, r: 108, fill: PALETTE.forest },
      { cx: 235 - j, cy: 145, r: 96, fill: PALETTE.rose, blend: true },
    ],
  }),
  (j) => ({
    background: PALETTE.card,
    bgBlobs: [
      { cx: 340, cy: 40, r: 140, fill: PALETTE.roseDeep },
      { cx: 60, cy: 220, r: 160, fill: PALETTE.forestDeep },
    ],
    circles: [
      { cx: 270, cy: 95 + j, r: 88, fill: PALETTE.roseDeep },
      { cx: 205, cy: 190 - j, r: 122, fill: PALETTE.forestDeep, blend: true },
    ],
  }),
  (j) => ({
    background: PALETTE.forest,
    bgBlobs: [
      { cx: 60, cy: 210, r: 150, fill: PALETTE.sageWhite },
      { cx: 330, cy: 50, r: 130, fill: PALETTE.rose },
    ],
    circles: [
      { cx: 130 + j, cy: 160, r: 100, fill: PALETTE.sageWhite },
      { cx: 205 - j, cy: 100, r: 78, fill: PALETTE.rose, blend: true },
    ],
  }),
  (j) => ({
    background: PALETTE.sageWhite,
    bgBlobs: [
      { cx: 350, cy: 220, r: 180, fill: PALETTE.roseDeep },
      { cx: 190, cy: 30, r: 120, fill: PALETTE.forest },
    ],
    circles: [
      { cx: 300 - j, cy: 180, r: 130, fill: PALETTE.roseDeep },
      { cx: 230 + j, cy: 90, r: 70, fill: PALETTE.forest, blend: true },
    ],
  }),
  (j) => ({
    background: PALETTE.rose,
    bgBlobs: [
      { cx: 100, cy: 40, r: 160, fill: PALETTE.forestDeep },
      { cx: 330, cy: 210, r: 110, fill: PALETTE.card },
    ],
    circles: [
      { cx: 160, cy: 120 + j, r: 112, fill: PALETTE.forestDeep },
      { cx: 260, cy: 165 - j, r: 66, fill: PALETTE.card, blend: true },
    ],
  }),
  (j) => ({
    background: PALETTE.card,
    bgBlobs: [
      { cx: 50, cy: 40, r: 120, fill: PALETTE.forest },
      { cx: 250, cy: 220, r: 180, fill: PALETTE.roseDeep },
    ],
    circles: [
      { cx: 100 + j, cy: 90, r: 74, fill: PALETTE.forest },
      { cx: 180 - j, cy: 150, r: 118, fill: PALETTE.roseDeep, blend: true },
    ],
  }),
];

export function getBrandCover(seed: string): BrandCoverSpec {
  const h = hashSeed(seed);
  const composition = COMPOSITIONS[h % COMPOSITIONS.length];
  const jitter = (h % 24) - 12;
  return composition(jitter);
}

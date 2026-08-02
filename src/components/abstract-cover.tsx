import { getBrandCover } from "@/lib/brand-cover";

// Portada ilustrada de marca — sin hooks ni estado, así que funciona igual
// en Server Components (tarjetas de /biblioteca, hero de cada artículo) que
// si se usara dentro de un componente cliente (fallback de thumbnail de
// video). `seed` determina el resultado (slug del artículo, id del video).
export function AbstractCover({ seed, className }: { seed: string; className?: string }) {
  const { background, circles } = getBrandCover(seed);

  return (
    <svg
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <rect width="400" height="240" fill={background} />
      {circles.map((c, i) => (
        <circle
          key={i}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill={c.fill}
          style={c.blend ? { mixBlendMode: "multiply" } : undefined}
        />
      ))}
    </svg>
  );
}

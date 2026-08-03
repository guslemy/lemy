import { getBrandCover } from "@/lib/brand-cover";

// Portada ilustrada de marca — sin hooks ni estado, así que funciona igual
// en Server Components (tarjetas de /biblioteca, hero de cada artículo,
// hero de /enfoques) que en un componente cliente (fallback de thumbnail de
// video). `seed` determina el resultado (slug del artículo, id del video).
//
// Gustavo pidió una foto de stock de fondo, atenuada hacia los colores de
// marca, con los círculos encima. Mi sandbox no tiene salida a redes de
// imágenes (Unsplash, Picsum, etc. — bloqueadas por el allowlist), así que
// por ahora simulo esa sensación "fotográfica" con formas grandes y
// difuminadas + una capa de grano sutil (bgBlobs, ver brand-cover.ts), en
// vez de círculos planos sobre un solo color. Si `photoUrl` se pasa (una
// vez que subas fotos reales), se usa la foto de verdad como fondo en su
// lugar, con los mismos círculos y el mismo velo de color encima.
export function AbstractCover({
  seed,
  photoUrl,
  className,
}: {
  seed: string;
  photoUrl?: string;
  className?: string;
}) {
  const { background, circles, bgBlobs } = getBrandCover(seed);
  const filterId = `grain-${seed.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" />
        </filter>
        <clipPath id={`${filterId}-clip`}>
          <rect width="400" height="240" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${filterId}-clip)`}>
        <rect width="400" height="240" fill={background} />

        {photoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <image href={photoUrl} x="0" y="0" width="400" height="240" preserveAspectRatio="xMidYMid slice" />
            <rect width="400" height="240" fill={background} opacity="0.55" />
          </>
        ) : (
          <g style={{ filter: "blur(38px)" }} opacity="0.65">
            {bgBlobs.map((b, i) => (
              <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} />
            ))}
          </g>
        )}

        {/* Grano sutil — le quita lo "plano" al degradado, se siente más
            fotográfico/texturizado incluso sin una imagen real. */}
        <rect width="400" height="240" filter={`url(#${filterId})`} opacity="0.05" />

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
      </g>
    </svg>
  );
}

// Mini calificación para tarjetas de terapeuta (home, /buscar, test de
// afinidad) — mismo lenguaje visual que el widget grande del perfil
// público, a escala de tarjeta. No se muestra nada si todavía no hay
// reseñas: un "0.0 ★" inventado en una tarjeta sería engañoso.
export function RatingBadge({
  avg,
  count,
  className = "",
}: {
  avg: number;
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <p className={`flex items-center gap-1 text-[0.82rem] text-rose-deep ${className}`}>
      <span aria-hidden>★</span>
      <span className="font-medium">{avg.toFixed(1)}</span>
      <span className="text-[#8B978F]">
        ({count} reseña{count === 1 ? "" : "s"})
      </span>
    </p>
  );
}

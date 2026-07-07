import Link from "next/link";
import { Tag } from "@/components/ui/pill";

// Tarjeta de terapeuta con datos reales de Supabase — usada en /buscar.
// (Distinta de DirectoryPreview, que muestra datos de ejemplo en la landing.)
export type TherapistCardData = {
  slug: string;
  display_name: string;
  tagline: string | null;
  city: string | null;
  price_min: number | null;
  price_max: number | null;
  is_online_available: boolean;
  specialties: string[];
};

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

export function TherapistCard({ t, index = 0 }: { t: TherapistCardData; index?: number }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <Link
      href={`/terapeuta/${t.slug}`}
      className="signature-corner block rounded-[28px] border border-line bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)]"
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full font-display text-lg font-semibold text-white"
        style={{ background: gradient }}
      >
        {initialsFrom(t.display_name)}
      </div>
      <h3 className="font-display text-[1.12rem] text-forest">{t.display_name}</h3>
      {t.tagline && <p className="mt-0.5 font-mono text-[0.86rem] text-rose-deep">{t.tagline}</p>}
      {t.city && <p className="mt-3 text-[0.9rem] text-[#42504A]">{t.city}</p>}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {t.is_online_available && <Tag>Online</Tag>}
        {t.specialties.slice(0, 2).map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <span className="text-[0.85rem] text-[#42504A]">{priceLabel(t.price_min, t.price_max)}</span>
        <span className="text-[0.85rem] font-semibold text-forest">Ver perfil →</span>
      </div>
    </Link>
  );
}

import Link from "next/link";

// Antes, cada subpágina del dashboard era un callejón sin salida: para
// volver al panel había que usar el botón "atrás" del navegador o el logo.
// Este link chiquito y consistente resuelve eso en todas las subpáginas.
export function BackToDashboard() {
  return (
    <div className="mt-10">
      <Link href="/dashboard" className="text-[0.85rem] font-medium text-forest hover:text-rose-deep">
        ← Volver a mi panel
      </Link>
    </div>
  );
}

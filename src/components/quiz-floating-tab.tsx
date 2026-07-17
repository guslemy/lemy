import Link from "next/link";

// Entrada secundaria y discreta al cuestionario de match — a propósito NO es
// un popup ni un modal. En un sitio de salud mental, algo que aparece encima
// de la pantalla sin pedirlo se siente invasivo justo para quien llega con
// más fragilidad. Esta es una pestañita fija en el borde, visible pero
// ignorable, para quien todavía no ha decidido usar el buscador directo.
export function QuizFloatingTab() {
  return (
    <Link
      href="/encuentra"
      className="fixed bottom-6 right-0 z-40 flex items-center gap-2 rounded-l-full border border-r-0 border-line bg-card py-3 pl-4.5 pr-5 text-[0.85rem] font-semibold text-forest shadow-[var(--shadow-signature)] transition-all duration-200 hover:pr-6 hover:text-rose-deep"
    >
      <span aria-hidden>✦</span>
      ¿No sabes por dónde empezar?
    </Link>
  );
}

import Link from "next/link";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M14.5 8.5H16V6h-1.5C12.6 6 11.3 7.3 11.3 9.3V11H9.5v3h1.8v7h3v-7h2.1l.4-3h-2.5V9.5c0-.6.2-1 1-1z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-forest-deep py-16 text-sage-white/75">
      <div className="mx-auto max-w-[1180px] px-6 sm:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/15 pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-display text-2xl font-semibold text-sage-white">
              <span className="relative h-4 w-[22px] flex-none">
                <span className="absolute left-0 top-0.5 h-3.5 w-3.5 rounded-full bg-forest/90" />
                <span className="absolute left-[9px] top-0.5 h-3.5 w-3.5 rounded-full bg-rose mix-blend-multiply" />
              </span>
              Lemy
            </Link>
            <p className="mt-3.5 max-w-[260px] text-sm text-sage-white/60">
              Un directorio pensado para que encontrar terapia se sienta claro, humano y accesible.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[0.72rem] tracking-[0.1em] text-rose uppercase">Pacientes</h4>
            <a href="#directorio" className="mb-2.5 block text-sm text-sage-white/70 hover:text-white">Terapeutas verificados</a>
            <a href="#que-es-lemy" className="mb-2.5 block text-sm text-sage-white/70 hover:text-white">¿Qué es Lemy?</a>
            <a href="#confianza" className="mb-2.5 block text-sm text-sage-white/70 hover:text-white">Confianza y privacidad</a>
            <a href="/biblioteca" className="mb-2.5 block text-sm text-sage-white/70 hover:text-white">Biblioteca</a>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[0.72rem] tracking-[0.1em] text-rose uppercase">Terapeutas</h4>
            <a href="#terapeutas" className="mb-2.5 block text-sm text-sage-white/70 hover:text-white">Crear perfil</a>
            <a href="#perfil" className="mb-2.5 block text-sm text-sage-white/70 hover:text-white">Ejemplo de perfil</a>
            <a href="#" className="mb-2.5 block text-sm text-sage-white/70 hover:text-white">Preguntas frecuentes</a>
          </div>

          <div>
            <h4 className="mb-4 font-mono text-[0.72rem] tracking-[0.1em] text-rose uppercase">Contacto</h4>
            <a href="mailto:hola@lemy.mx" className="mb-4 block text-sm text-sage-white/70 hover:text-white">hola@lemy.mx</a>
            <div className="flex gap-2.5">
              <a
                href="https://facebook.com/lemy.online"
                target="_blank"
                rel="noreferrer"
                aria-label="Lemy en Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-sage-white/70 transition-colors hover:border-white/40 hover:text-white"
              >
                <FacebookIcon />
              </a>
              <a
                href="https://instagram.com/lemy.online"
                target="_blank"
                rel="noreferrer"
                aria-label="Lemy en Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-sage-white/70 transition-colors hover:border-white/40 hover:text-white"
              >
                <InstagramIcon />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2.5 pt-6 text-[0.82rem] text-sage-white/50">
          <span>© 2026 Lemy. Todos los derechos reservados.</span>
          <span>
            <a href="/privacidad" className="hover:text-white">
              Aviso de privacidad
            </a>{" "}
            ·{" "}
            <a href="/terminos" className="hover:text-white">
              Términos de uso
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

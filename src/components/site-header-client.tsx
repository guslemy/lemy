"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "#que-es-lemy", label: "¿Qué es Lemy?" },
  { href: "#directorio", label: "Terapeutas verificados" },
  { href: "#terapeutas", label: "¿Eres terapeuta?" },
];

// El test de afinidad es, en el fondo, otro CTA — se destaca aparte de los
// demás links de texto plano en vez de mezclarse con ellos.
const AFFINITY_TEST = { href: "/encuentra", label: "Test de afinidad" };

export type SiteRole = "admin" | "therapist" | "patient" | null;

// Los botones de la derecha (y del menú móvil) dependen de si hay sesión y
// de qué rol tiene esa cuenta — antes siempre mostraban "Iniciar sesión" /
// "Soy terapeuta" aunque ya estuvieras dentro, lo cual era confuso. Ahora
// cada quien ve un atajo directo a su propio panel.
function RightCtas({ isLoggedIn, role, className = "" }: { isLoggedIn: boolean; role: SiteRole; className?: string }) {
  if (!isLoggedIn) {
    return (
      <>
        <Button href="/login" variant="ghost" className={className}>
          Iniciar sesión
        </Button>
        <Button href="#terapeutas" variant="primary" className={className}>
          Soy terapeuta
        </Button>
      </>
    );
  }

  if (role === "admin") {
    return (
      <>
        <Button href="/dashboard" variant="ghost" className={className}>
          Dashboard
        </Button>
        <Button href="/dashboard/contenido" variant="primary" className={className}>
          Panel de contenido
        </Button>
      </>
    );
  }

  if (role === "therapist") {
    return (
      <>
        <Button href="/dashboard" variant="ghost" className={className}>
          Dashboard
        </Button>
        <Button href="/dashboard/pacientes" variant="primary" className={className}>
          Mis pacientes
        </Button>
      </>
    );
  }

  // Paciente
  return (
    <Button href="/dashboard/mis-citas" variant="primary" className={className}>
      Mi cuenta
    </Button>
  );
}

function NotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/dashboard/notificaciones"
      className="relative text-[1.05rem] text-forest hover:text-rose-deep"
      aria-label="Notificaciones"
    >
      🔔
      {unreadCount > 0 && (
        <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-deep px-1 font-mono text-[0.6rem] text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

export function SiteHeaderClient({
  isLoggedIn,
  role,
  unreadCount,
}: {
  isLoggedIn: boolean;
  role: SiteRole;
  unreadCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-sage-white/86 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-semibold text-forest">
          <span className="relative h-4 w-[22px] flex-none">
            <span className="absolute left-0 top-0.5 h-3.5 w-3.5 rounded-full bg-forest/90" />
            <span className="absolute left-[9px] top-0.5 h-3.5 w-3.5 rounded-full bg-rose mix-blend-multiply" />
          </span>
          Lemy
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <a
            href={AFFINITY_TEST.href}
            className="rounded-full bg-rose-deep px-4 py-1.5 text-white shadow-[0_4px_14px_-6px_rgba(193,120,106,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a86356]"
          >
            {AFFINITY_TEST.label}
          </a>
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="group relative py-1 text-ink">
              {link.label}
              <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-rose-deep transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4.5 md:flex">
          {isLoggedIn && <NotificationBell unreadCount={unreadCount} />}
          <RightCtas isLoggedIn={isLoggedIn} role={role} />
        </div>

        <button
          aria-label="Abrir menú"
          onClick={() => setMenuOpen((v) => !v)}
          className="text-forest md:hidden"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-5 border-t border-line bg-sage-white px-6 py-6 md:hidden">
          <a
            href={AFFINITY_TEST.href}
            onClick={() => setMenuOpen(false)}
            className="rounded-full bg-rose-deep px-4 py-2 text-center font-semibold text-white"
          >
            {AFFINITY_TEST.label}
          </a>
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          {isLoggedIn && (
            <Link
              href="/dashboard/notificaciones"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              🔔 Notificaciones{unreadCount > 0 ? ` (${unreadCount > 9 ? "9+" : unreadCount})` : ""}
            </Link>
          )}
          <RightCtas isLoggedIn={isLoggedIn} role={role} className="w-full" />
        </nav>
      )}
    </header>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PwaNavButtons } from "@/components/pwa-nav-buttons";
import { signOut } from "@/app/actions";

// Antes estos eran anclas sueltas ("#que-es-lemy") — funcionaban solo
// parados en la home. En cualquier otra página (biblioteca, enfoques,
// perfil de terapeuta...) el navegador no encontraba ese id y no pasaba
// nada. Con "/" al frente, el navegador (o next/link) primero va a la home
// y desde ahí baja hasta la sección — funciona sin importar en qué página
// estés parado.
const navLinks = [
  { href: "/#que-es-lemy", label: "¿Qué es Lemy?" },
  { href: "/#directorio", label: "Terapeutas verificados" },
  { href: "/#terapeutas", label: "¿Eres terapeuta?" },
];

// El test de afinidad es, en el fondo, otro CTA — se destaca aparte de los
// demás links de texto plano en vez de mezclarse con ellos.
const AFFINITY_TEST = { href: "/test", label: "Test de afinidad" };

export type SiteRole = "admin" | "therapist" | "patient" | null;

// Los botones de la derecha (y del menú móvil) dependen de si hay sesión y
// de qué rol tiene esa cuenta — antes siempre mostraban "Iniciar sesión" /
// "Soy terapeuta" aunque ya estuvieras dentro, lo cual era confuso. Ahora
// cada quien ve un atajo directo a su propio panel.
function RightCtas({
  isLoggedIn,
  role,
  className = "",
  compactSignOut = false,
  inverted = false,
}: {
  isLoggedIn: boolean;
  role: SiteRole;
  className?: string;
  compactSignOut?: boolean;
  inverted?: boolean;
}) {
  // En el header oscuro de la home, "ghost" (borde forest sobre fondo
  // claro) y "primary" (bg-forest) se pierden contra el forest-deep del
  // fondo — se usan las variantes ya pensadas para fondo oscuro (las
  // mismas que el bloque "¿Eres terapeuta?" de esta misma página).
  const secondaryVariant = inverted ? "outline-light" : "ghost";
  const primaryVariant = inverted ? "rose" : "primary";

  if (!isLoggedIn) {
    return (
      <>
        <Button href="/login" variant={secondaryVariant} className={className}>
          Iniciar sesión
        </Button>
        <Button href="/#terapeutas" variant={primaryVariant} className={className}>
          Soy terapeuta
        </Button>
      </>
    );
  }

  if (role === "admin") {
    return (
      <>
        <Button href="/dashboard" variant={secondaryVariant} className={className}>
          Dashboard
        </Button>
        <Button href="/dashboard/admin" variant={primaryVariant} className={className}>
          Panel de contenido
        </Button>
        <SignOutLink className={className} compact={compactSignOut} inverted={inverted} />
      </>
    );
  }

  if (role === "therapist") {
    return (
      <>
        <Button href="/dashboard" variant={secondaryVariant} className={className}>
          Dashboard
        </Button>
        <Button href="/dashboard/pacientes" variant={primaryVariant} className={className}>
          Mis pacientes
        </Button>
        <SignOutLink className={className} compact={compactSignOut} inverted={inverted} />
      </>
    );
  }

  // Paciente
  return (
    <>
      <Button href="/dashboard" variant={primaryVariant} className={className}>
        Mi cuenta
      </Button>
      <SignOutLink className={className} compact={compactSignOut} inverted={inverted} />
    </>
  );
}

function LogOutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

// No había ningún botón de cerrar sesión en todo el sitio — "Mi cuenta"
// solo llevaba al dashboard. Deliberadamente discreto (texto, no un
// Button con fondo) para no competir visualmente con los CTAs principales,
// pero siempre visible junto a ellos en vez de escondido en otro menú.
//
// `compact`: en el header de escritorio, con dos botones + campana + este
// link, el texto completo "Cerrar sesión" era uno de los principales
// culpables de que todo se viera apretado (sobre todo en la vista de
// admin/terapeuta, que ya trae dos botones). Ahí se reduce a solo el ícono
// con aria-label — en el menú móvil (que apila todo verticalmente, sin
// competir por ancho) se queda como texto completo.
function SignOutLink({
  className = "",
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        aria-label="Cerrar sesión"
        title={compact ? "Cerrar sesión" : undefined}
        className={`flex items-center gap-1.5 text-[0.85rem] font-medium transition-colors ${
          inverted ? "text-sage-white/70 hover:text-white" : "text-[#7C877F] hover:text-rose-deep"
        } ${compact ? `border-l pl-3.5 ${inverted ? "border-white/20" : "border-line"}` : ""} ${className}`}
      >
        <LogOutIcon />
        {!compact && "Cerrar sesión"}
      </button>
    </form>
  );
}

function NotificationBell({ unreadCount, inverted = false }: { unreadCount: number; inverted?: boolean }) {
  return (
    <Link
      href="/dashboard/notificaciones"
      className={`relative text-[1.05rem] ${
        inverted ? "text-sage-white hover:text-rose" : "text-forest hover:text-rose-deep"
      }`}
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
  inverted = false,
}: {
  isLoggedIn: boolean;
  role: SiteRole;
  unreadCount: number;
  // Solo la home lo pide ("Cambios al Home", 2026-09-24): header con los
  // colores invertidos (fondo forest-deep, igual que el footer) y el logo
  // en su versión clara — el resto del sitio se queda con el header claro
  // de siempre. Nada de esto depende de la ruta (usePathname) porque
  // <SiteHeader> ya se invoca a mano por página; la home simplemente le
  // pasa inverted=true.
  inverted?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // El test de afinidad es un CTA para quien todavía está buscando
  // terapeuta — a un admin o terapeuta ya logueado no le sirve de nada y
  // solo suma ruido/ancho al header. Para pacientes se queda (puede
  // interesarles repetirlo o recomendarlo), y para quien no tiene sesión
  // sigue siendo el CTA principal.
  const showAffinityTest = !(isLoggedIn && (role === "therapist" || role === "admin"));

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md ${
        inverted ? "border-b border-white/12 bg-forest-deep/92" : "border-b border-line bg-sage-white/86"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-1">
          <PwaNavButtons />
          {inverted ? (
            // Igual que el logo del footer (isologo + "Lemy"), solo que más
            // grande — así pidió Gustavo que se viera en la home.
            <Link href="/" className="flex items-center gap-3 font-display text-[2.1rem] font-semibold text-sage-white">
              <img
                src="/brand/isologo-crema-acento.png"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 flex-none"
              />
              Lemy
            </Link>
          ) : (
            <Link href="/" className="flex items-center">
              <img src="/brand/logo-horizontal-verde.png" alt="Lemy" className="h-9 w-auto flex-none" />
            </Link>
          )}
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium xl:flex">
          {showAffinityTest && (
            <Link
              href={AFFINITY_TEST.href}
              className="rounded-full bg-rose-deep px-4 py-1.5 text-white shadow-[0_4px_14px_-6px_rgba(193,120,106,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a86356]"
            >
              {AFFINITY_TEST.label}
            </Link>
          )}
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative py-1 ${inverted ? "text-sage-white/90" : "text-ink"}`}
            >
              {link.label}
              <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-rose-deep transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 xl:flex">
          {isLoggedIn && <NotificationBell unreadCount={unreadCount} inverted={inverted} />}
          <RightCtas isLoggedIn={isLoggedIn} role={role} compactSignOut inverted={inverted} />
        </div>

        <button
          aria-label="Abrir menú"
          onClick={() => setMenuOpen((v) => !v)}
          className={`p-1 text-[1.75rem] leading-none xl:hidden ${inverted ? "text-sage-white" : "text-forest"}`}
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <nav
          className={`flex flex-col gap-5 border-t px-6 py-6 xl:hidden ${
            inverted ? "border-white/12 bg-forest-deep text-sage-white" : "border-line bg-sage-white"
          }`}
        >
          {showAffinityTest && (
            <Link
              href={AFFINITY_TEST.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-rose-deep px-4 py-2 text-center font-semibold text-white"
            >
              {AFFINITY_TEST.label}
            </Link>
          )}
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
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
          <RightCtas isLoggedIn={isLoggedIn} role={role} className="w-full" inverted={inverted} />
        </nav>
      )}
    </header>
  );
}

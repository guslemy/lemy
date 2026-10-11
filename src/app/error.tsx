"use client";

import { useEffect } from "react";
import Image from "next/image";

// Pantalla de error de Lemy (2026-10-11). Antes, cualquier falla del lado del
// navegador (una pestaña con una versión vieja del sitio tras un deploy, la
// traducción automática de Chrome que reescribe el texto de la página, un
// corte de red al pedir la siguiente pantalla...) mostraba la pantalla negra
// genérica de Next en inglés: "This page couldn't load".
//
// Aquí se cambia por un mensaje en español con el estilo de Lemy y, además,
// se recarga sola UNA vez: la mayoría de esas fallas desaparecen con una
// recarga completa. El sello en sessionStorage evita un ciclo infinito si la
// falla es real — pasados 30 segundos se permite otro intento automático.
const RELOAD_KEY = "lemy-error-auto-reload";
const RELOAD_COOLDOWN_MS = 30_000;

// (Next también pasa `reset`, pero no se usa: reintentar el mismo render del
// lado del cliente casi nunca arregla estas fallas, una recarga completa sí.)
export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("Error de pantalla:", error);

    try {
      const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? "0");
      if (Date.now() - last > RELOAD_COOLDOWN_MS) {
        window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {
      // sin sessionStorage (modo privado estricto, etc.): no se recarga solo;
      // el usuario aún tiene el botón.
    }
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sage-white px-6 py-16 text-center">
      <Image
        src="/brand/LemyLogoHoriz_Green.png"
        alt="Lemy"
        width={2160}
        height={1080}
        priority
        className="h-16 w-auto"
      />
      <p className="mt-10 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
        Algo no salió como esperábamos
      </p>
      <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
        Esta página no pudo cargar
      </h1>
      <p className="mt-3 max-w-[440px] text-[0.95rem] text-[#3E4B44]">
        No es nada que hayas hecho tú. Intenta de nuevo; si sigue pasando, vuelve al inicio o
        escríbenos a{" "}
        <a href="mailto:hola@lemy.mx" className="text-forest underline">
          hola@lemy.mx
        </a>
        .
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-sage-white transition-all duration-200 hover:bg-forest-deep active:scale-95"
        >
          Reintentar
        </button>
        {/* <a> y no <Link>: si la app quedó en mal estado, una navegación
            completa es lo que de verdad la limpia. */}
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-forest px-6 py-2.5 text-sm font-semibold text-forest transition-all duration-200 hover:bg-forest hover:text-sage-white active:scale-95"
        >
          Ir al inicio
        </a>
      </div>
    </main>
  );
}

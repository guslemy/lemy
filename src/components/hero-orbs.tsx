"use client";

import { useEffect, useRef } from "react";

// Los dos "orbes" del hero: flotan solos (CSS) y además se mueven un poco
// con el scroll (parallax ligero) para darle ese extra "muy llamativo"
// sin perder la sensación de calma.
export function HeroOrbs() {
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (orb1Ref.current) orb1Ref.current.style.transform = `translateY(${y * 0.08}px)`;
      if (orb2Ref.current) orb2Ref.current.style.transform = `translateY(${y * -0.1}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative h-[280px] md:h-[420px]" aria-hidden="true">
      <div
        ref={orb1Ref}
        className="animate-float-a absolute left-2.5 top-[30px] h-[220px] w-[220px] rounded-full md:h-[280px] md:w-[280px]"
        style={{ background: "radial-gradient(circle at 35% 30%, #35604A, var(--forest))" }}
      />
      <div
        ref={orb2Ref}
        className="animate-float-b absolute left-[150px] top-[100px] h-[190px] w-[190px] rounded-full mix-blend-multiply md:left-[190px] md:top-[130px] md:h-[250px] md:w-[250px]"
        style={{ background: "radial-gradient(circle at 65% 65%, #EFC9BF, var(--rose))" }}
      />
      <span className="absolute left-0.5 top-3.5 rounded-full border border-line bg-sage-white px-3 py-1.5 font-mono text-[0.72rem] text-forest">
        lo que buscas
      </span>
      <span className="absolute bottom-4 right-0 rounded-full border border-line bg-sage-white px-3 py-1.5 font-mono text-[0.72rem] text-rose-deep">
        quien lo atiende
      </span>
      <span className="absolute left-[150px] top-[150px] rounded-full bg-card px-4 py-2 font-display text-[1.05rem] font-semibold text-forest shadow-[var(--shadow-signature)] md:left-[190px] md:top-[190px] md:text-[1.2rem]">
        Lemy
      </span>
    </div>
  );
}

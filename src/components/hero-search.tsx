"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";

// Buscador secundario del hero. Las "pills" ya no son solo decorativas: dan
// clic y llenan el campo de texto (como un atajo), en vez de ser una lista
// muda de palabras. El input sigue siendo editable a mano igual que antes.
export function HeroSearch({ suggestions }: { suggestions: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/buscar?q=${encodeURIComponent(term)}` : "/buscar");
  }

  return (
    <div className="mt-6 max-w-[480px]">
      <p className="text-[0.85rem] text-[#5A665F]">O, si ya sabes qué buscas:</p>
      <form
        onSubmit={handleSubmit}
        className="mt-2.5 flex gap-2 rounded-full border border-line bg-card py-1.5 pl-5 pr-1.5"
      >
        <input
          type="text"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ej. ansiedad, pareja…"
          className="flex-1 bg-transparent text-[0.92rem] text-ink outline-none placeholder:text-[#8B978F]"
        />
        <Button type="submit" variant="ghost">
          Buscar
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {suggestions.map((label) => (
          <Pill key={label} active={q === label} onClick={() => setQ(label)}>
            {label}
          </Pill>
        ))}
      </div>
    </div>
  );
}

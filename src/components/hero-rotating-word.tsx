"use client";

import { useEffect, useState } from "react";

// Palabra del hero que cambia sola cada ciertos segundos, con un fundido
// simple (fade out → cambia → fade in). Lista fácil de extender: solo hay
// que agregar strings aquí (o pasar otra lista por props).
const DEFAULT_WORDS = ["escucharte", "acompañarte", "ayudarte"];

const INTERVAL_MS = 2800;
const FADE_MS = 350;

export function HeroRotatingWord({ words = DEFAULT_WORDS }: { words?: string[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (words.length <= 1) return;

    const fadeOutTimer = setTimeout(() => setVisible(false), INTERVAL_MS - FADE_MS);
    const nextWordTimer = setTimeout(() => {
      setIndex((i) => (i + 1) % words.length);
      setVisible(true);
    }, INTERVAL_MS);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(nextWordTimer);
    };
  }, [index, words]);

  return (
    <em
      className="font-medium not-italic italic text-rose-deep transition-opacity ease-in-out"
      style={{ transitionDuration: `${FADE_MS}ms`, opacity: visible ? 1 : 0 }}
    >
      {words[index]}
    </em>
  );
}

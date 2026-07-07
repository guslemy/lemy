"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Login alterno para quien no usa Google — sin contraseña que inventar ni
// recordar: escribes tu correo, te llega un link, entras. Funciona con
// cualquier proveedor de correo (Hotmail, Outlook, Yahoo, etc.). Si el
// correo es nuevo, Supabase crea la cuenta sola al verificar el link.
export function EmailAuthForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatus("loading");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });

    if (error) {
      setErrorMsg("Algo salió mal. Intenta de nuevo en un momento.");
      setStatus("idle");
      return;
    }

    setStatus("sent");
  };

  if (status === "sent") {
    return (
      <p className="max-w-sm text-center text-sm text-neutral-600">
        Te mandamos un link a <strong>{email}</strong>. Ábrelo desde tu correo
        y vas a entrar directo, sin necesidad de contraseña.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <input
        type="email"
        required
        placeholder="tu@correo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
      />

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-[#0f3d3e] px-6 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {status === "loading" ? "Un momento..." : "Mandarme un link para entrar"}
      </button>
    </form>
  );
}

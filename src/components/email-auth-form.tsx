"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Login alterno para quien no tiene (o no quiere usar) cuenta de Google —
// funciona con cualquier proveedor de correo (Hotmail, Outlook, Yahoo, etc.).
export function EmailAuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "check-email">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatus("loading");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(traducirError(error.message));
        setStatus("idle");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      if (error) {
        setErrorMsg(traducirError(error.message));
        setStatus("idle");
        return;
      }
      setStatus("check-email");
    }
  };

  if (status === "check-email") {
    return (
      <p className="max-w-sm text-center text-sm text-neutral-600">
        Te mandamos un correo a <strong>{email}</strong>. Ábrelo y dale clic al
        link para activar tu cuenta.
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
      <input
        type="password"
        required
        minLength={6}
        placeholder="Contraseña (mínimo 6 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
      />

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-[#0f3d3e] px-6 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {status === "loading"
          ? "Un momento..."
          : mode === "login"
            ? "Entrar"
            : "Crear cuenta"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="text-sm text-neutral-500 underline"
      >
        {mode === "login" ? "¿Primera vez? Crea tu cuenta" : "¿Ya tienes cuenta? Entra"}
      </button>
    </form>
  );
}

function traducirError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("User already registered")) {
    return "Ese correo ya tiene una cuenta — mejor entra en vez de crear una nueva.";
  }
  if (message.includes("Password should be")) {
    return "La contraseña necesita al menos 6 caracteres.";
  }
  return "Algo salió mal. Intenta de nuevo.";
}

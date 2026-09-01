"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Login alterno para quien no tiene (o no quiere usar) cuenta de Google —
// funciona con cualquier proveedor de correo (Hotmail, Outlook, Yahoo, etc.).
export function EmailAuthForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "check-email">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatus("loading");

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(traducirError(error.message));
        setStatus("idle");
        return;
      }

      // Cuenta desactivada desde el panel de admin — no la dejamos entrar,
      // aunque la contraseña sea correcta.
      if (data.user) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("deactivated_at")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profileRow?.deactivated_at) {
          await supabase.auth.signOut();
          setErrorMsg("Esta cuenta está desactivada. Contacta a soporte si crees que es un error.");
          setStatus("idle");
          return;
        }
      }

      router.push(next || "/dashboard");
      router.refresh();
    } else {
      if (fullName.trim().length < 2) {
        setErrorMsg("Escribe tu nombre completo.");
        setStatus("idle");
        return;
      }
      if (phone.replace(/\D/g, "").length < 10) {
        setErrorMsg("Escribe un teléfono válido (al menos 10 dígitos).");
        setStatus("idle");
        return;
      }

      const confirmUrl = new URL("/auth/confirm", window.location.origin);
      if (next) confirmUrl.searchParams.set("next", next);

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: confirmUrl.toString(),
          data: { full_name: fullName.trim(), phone: phone.trim() },
        },
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
      <p className="max-w-sm text-center text-[0.9rem] text-[#3E4B44]">
        Te mandamos un correo a <strong className="text-forest">{email}</strong>. Ábrelo y dale
        clic al link para activar tu cuenta.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      {mode === "signup" && (
        <>
          <input
            type="text"
            required
            minLength={2}
            placeholder="Nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-lemy"
          />
          <input
            type="tel"
            required
            minLength={10}
            placeholder="Teléfono (para tu terapeuta)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-lemy"
          />
        </>
      )}
      <input
        type="email"
        required
        placeholder="tu@correo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-lemy"
      />
      <input
        type="password"
        required
        minLength={6}
        placeholder="Contraseña (mínimo 6 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-lemy"
      />

      {errorMsg && <p className="text-[0.85rem] text-rose-deep">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-sage-white transition-all duration-200 active:scale-95 hover:bg-forest-deep disabled:opacity-50"
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
        className="text-[0.85rem] text-[#7C877F] underline"
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
  if (message.includes("Unable to validate email address") || message.includes("invalid")) {
    return "Ese correo no es válido — revisa que esté bien escrito.";
  }
  if (message.includes("rate limit")) {
    return "Hiciste varios intentos seguidos. Espera un par de minutos y vuelve a intentar.";
  }
  // Antes cualquier error no reconocido (ej. algo específico de ciertos
  // proveedores de correo como Hotmail/Outlook/Yahoo) se mostraba como
  // "Algo salió mal, intenta de nuevo" sin ninguna pista de qué pasó en
  // realidad — imposible de diagnosticar a partir de un reporte de usuario.
  // Ahora se muestra el mensaje real de Supabase debajo del genérico.
  return `Algo salió mal. Intenta de nuevo. (${message})`;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Pantalla final de "Olvidé mi contraseña": la persona ya llegó con sesión
// (el link del correo pasó por /auth/callback), solo falta elegir la nueva.
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 6) {
      setErrorMsg("La contraseña necesita al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Las dos contraseñas no coinciden.");
      return;
    }
    setStatus("loading");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(
        error.message.includes("different from the old password")
          ? "Elige una contraseña distinta a la anterior."
          : `No pudimos cambiar la contraseña. Intenta de nuevo. (${error.message})`,
      );
      setStatus("idle");
      return;
    }
    setStatus("done");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  };

  if (status === "done") {
    return (
      <p className="max-w-sm text-center text-[0.9rem] text-[#3E4B44]">
        Listo, tu contraseña quedó actualizada. Te llevamos a tu cuenta…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <input
        type="password"
        required
        minLength={6}
        placeholder="Contraseña nueva (mínimo 6 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-lemy"
      />
      <input
        type="password"
        required
        minLength={6}
        placeholder="Repite la contraseña nueva"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="input-lemy"
      />
      {errorMsg && <p className="text-[0.85rem] text-rose-deep">{errorMsg}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-sage-white transition-all duration-200 active:scale-95 hover:bg-forest-deep disabled:opacity-50"
      >
        {status === "loading" ? "Un momento..." : "Guardar contraseña nueva"}
      </button>
    </form>
  );
}

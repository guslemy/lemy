"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";

// Botón de envío para <form action={serverAction}>. useFormStatus lee el
// estado del <form> padre más cercano en el DOM — funciona aunque el form
// en sí sea server-rendered, siempre y cuando este botón esté dentro de él.
// Se deshabilita y cambia de texto mientras se procesa, para que a nadie
// se le ocurra hacerle doble clic por no ver ninguna señal de que ya se
// está guardando (eso fue justo lo que causó registros duplicados antes).
export function SubmitButton({
  children,
  pendingText = "Guardando…",
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "ghost" | "rose" | "outline-light";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? pendingText : children}
    </Button>
  );
}

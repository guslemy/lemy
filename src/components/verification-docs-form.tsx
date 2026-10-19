"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { saveVerificationDocuments } from "@/app/dashboard/actions";

const MAX_DOC_BYTES = 8 * 1024 * 1024;
const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

type Tipo = "cedula" | "identificacion" | "titulo";

// Formulario de documentos de verificación (cédula, identificación, título).
//
// (2026-10-19) Antes era un <form action={serverAction}> con los archivos
// dentro. Tenía tres problemas: (1) si faltaba un documento, la página se
// recargaba y el navegador vaciaba TODOS los archivos ya elegidos; (2) el
// mensaje no decía cuál faltaba; (3) Vercel rechaza peticiones de más de
// ~4.5 MB, así que dos fotos de celular podían fallar sin mensaje claro.
// Ahora las validaciones se hacen aquí, en el navegador (los archivos
// elegidos se quedan donde están si hay un error), y cada archivo se sube
// directo a Supabase Storage; a la Server Action solo llegan las rutas.
export function VerificationDocsForm({
  userId,
  hasCedula,
  hasIdentificacion,
  hasTitulo,
}: {
  userId: string;
  hasCedula: boolean;
  hasIdentificacion: boolean;
  hasTitulo: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const files: Partial<Record<Tipo, File>> = {};
    for (const [tipo, field] of [
      ["cedula", "doc_cedula"],
      ["identificacion", "doc_identificacion"],
      ["titulo", "doc_titulo"],
    ] as const) {
      const f = form.get(field);
      if (f instanceof File && f.size > 0) files[tipo] = f;
    }

    if (!files.cedula && !hasCedula) {
      setError("Falta tu cédula profesional. Elige el archivo y vuelve a enviar.");
      return;
    }
    if (!files.identificacion && !hasIdentificacion) {
      setError("Falta tu identificación oficial. Elige el archivo y vuelve a enviar.");
      return;
    }
    if (Object.keys(files).length === 0) {
      setError("Elige al menos un documento para enviar.");
      return;
    }

    for (const [tipo, f] of Object.entries(files) as [Tipo, File][]) {
      const nombre = tipo === "cedula" ? "La cédula" : tipo === "identificacion" ? "La identificación" : "El título";
      if (!ALLOWED_DOC_TYPES.includes(f.type)) {
        setError(`${nombre} debe ser un PDF o una imagen JPG, PNG o WebP.`);
        return;
      }
      if (f.size > MAX_DOC_BYTES) {
        setError(`${nombre} pesa demasiado (máximo 8 MB).`);
        return;
      }
    }

    setSending(true);
    try {
      const supabase = createClient();
      const paths: Partial<Record<Tipo, string>> = {};
      for (const [tipo, f] of Object.entries(files) as [Tipo, File][]) {
        const ext = (f.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "pdf";
        const path = `${userId}/${tipo}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("therapist-documents")
          .upload(path, f, { upsert: true, contentType: f.type });
        if (upErr) {
          console.error(`Error subiendo documento de verificación (${tipo}):`, upErr);
          setError("No pudimos subir uno de tus documentos. Revisa tu conexión y vuelve a intentar.");
          setSending(false);
          return;
        }
        paths[tipo] = path;
      }

      // Registra las rutas y manda el aviso al equipo. Redirige al terminar.
      await saveVerificationDocuments(paths);
    } catch (err) {
      // El redirect() de una Server Action llega como una excepción especial
      // de Next.js que NO debe tratarse como error.
      if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      console.error("Error enviando documentos de verificación:", err);
      setError("Algo salió mal al enviar tus documentos. Intenta de nuevo.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Cédula profesional"
        hint={hasCedula ? "Ya tienes una cargada. Si no eliges otra, se conserva esta." : undefined}
      >
        <input type="file" name="doc_cedula" accept="application/pdf,image/*" className="input-lemy" />
      </Field>
      <Field
        label="Identificación oficial"
        hint={hasIdentificacion ? "Ya tienes una cargada. Si no eliges otra, se conserva esta." : undefined}
      >
        <input type="file" name="doc_identificacion" accept="application/pdf,image/*" className="input-lemy" />
      </Field>
      <Field
        label="Título profesional (opcional)"
        hint={hasTitulo ? "Ya tienes uno cargado. Si no eliges otro, se conserva este." : undefined}
      >
        <input type="file" name="doc_titulo" accept="application/pdf,image/*" className="input-lemy" />
      </Field>

      {error && (
        <p className="rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
          {error}
        </p>
      )}

      <Button type="submit" variant="ghost" disabled={sending}>
        {sending ? "Enviando…" : "Enviar documentos para revisión"}
      </Button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.78rem] text-[#7C877F]">{hint}</span>}
    </label>
  );
}

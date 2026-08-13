"use client";

import { useState } from "react";
import { setVerificationStatus, rejectVerification } from "@/app/dashboard/admin/actions";

type Documents = {
  cedula: string | null;
  identificacion: string | null;
  titulo: string | null;
};

function DocLink({ label, url }: { label: string; url: string | null }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-[#3E4B44]">{label}</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-forest underline underline-offset-2"
        >
          Ver documento →
        </a>
      ) : (
        <span className="text-[#B7C0BB]">No subido</span>
      )}
    </li>
  );
}

// Popup de revisión de verificación — se abre desde la fila del terapeuta
// en /dashboard/admin en vez de vivir en una pantalla aparte (decisión de
// Gustavo, 2026-08-13: "para prevenir crear algo nuevo"). Los links a
// documentos son URLs firmadas generadas server-side en page.tsx, porque el
// bucket "therapist-documents" es privado.
export function VerificationReviewButton({
  therapistId,
  name,
  status,
  verifiedByEmail,
  verifiedAt,
  documents,
}: {
  therapistId: string;
  name: string;
  status: string;
  verifiedByEmail: string | null;
  verifiedAt: string | null;
  documents: Documents;
}) {
  const [open, setOpen] = useState(false);
  const verified = status === "verified";
  const docCount = [documents.cedula, documents.identificacion, documents.titulo].filter(
    Boolean
  ).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          verified
            ? "text-[0.8rem] font-medium text-forest underline underline-offset-2"
            : "rounded-full border border-forest/30 px-3 py-1 text-[0.78rem] font-medium text-forest hover:bg-forest/[0.06]"
        }
      >
        {verified ? "✓ Verificado" : `Revisar (${docCount}/3 docs)`}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-deep/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="signature-corner w-full max-w-[420px] rounded-[24px] border border-line bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[1.05rem] text-forest">{name}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-none text-[#8B978F] hover:text-forest"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <ul className="mt-4 space-y-2 text-[0.85rem]">
              <DocLink label="Cédula profesional" url={documents.cedula} />
              <DocLink label="Identificación oficial" url={documents.identificacion} />
              <DocLink label="Título profesional" url={documents.titulo} />
            </ul>

            {verified ? (
              <>
                <p className="mt-4 text-[0.78rem] text-[#7C877F]">
                  Verificado por {verifiedByEmail ?? "—"}, el{" "}
                  {verifiedAt ? new Date(verifiedAt).toLocaleDateString("es-MX") : "—"}.
                </p>
                <form action={setVerificationStatus} className="mt-3">
                  <input type="hidden" name="therapist_id" value={therapistId} />
                  <input type="hidden" name="status" value="pending" />
                  <button
                    type="submit"
                    className="text-[0.8rem] text-rose-deep underline underline-offset-2"
                  >
                    Quitar verificación
                  </button>
                </form>
              </>
            ) : (
              <>
                <form action={setVerificationStatus} className="mt-4">
                  <input type="hidden" name="therapist_id" value={therapistId} />
                  <input type="hidden" name="status" value="verified" />
                  <button
                    type="submit"
                    className="w-full rounded-full bg-forest px-4 py-2 text-[0.85rem] font-semibold text-sage-white hover:bg-forest-deep"
                  >
                    Aprobar verificación
                  </button>
                </form>

                <form action={rejectVerification} className="mt-3">
                  <input type="hidden" name="therapist_id" value={therapistId} />
                  <textarea
                    name="reason"
                    placeholder="Motivo del rechazo (se le manda por correo)"
                    rows={2}
                    className="input-lemy text-[0.82rem]"
                  />
                  <button
                    type="submit"
                    className="mt-2 w-full rounded-full border border-rose-deep/30 px-4 py-2 text-[0.85rem] font-medium text-rose-deep hover:bg-rose/10"
                  >
                    Rechazar
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

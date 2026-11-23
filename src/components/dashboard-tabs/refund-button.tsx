"use client";

import { useState, useTransition } from "react";
import { refundCardPayment } from "@/app/dashboard/pagos/refund-actions";

export function RefundButton({ appointmentId, patientName }: { appointmentId: string; patientName: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <span className="mt-1 block text-[0.75rem] text-forest">Reembolso solicitado. Se verá reflejado en unos momentos.</span>;

  return (
    <div className="mt-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`¿Reembolsar el pago completo a ${patientName}? Esta acción no se puede deshacer.`)) return;
          setMessage(null);
          startTransition(async () => {
            const r = await refundCardPayment(appointmentId);
            if (r.ok) setDone(true);
            else setMessage(r.error);
          });
        }}
        className="rounded-full border border-forest/30 px-3 py-1 text-[0.75rem] font-medium text-forest hover:bg-forest/[0.06] disabled:opacity-50"
      >
        {pending ? "Reembolsando…" : "Reembolsar"}
      </button>
      {message && <span className="mt-1 block text-[0.75rem] text-rose-deep">{message}</span>}
    </div>
  );
}

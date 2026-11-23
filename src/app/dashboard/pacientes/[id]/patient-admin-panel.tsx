"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { hidePatientFromList, restorePatientToList, updateImportedPatient } from "./patient-admin-actions";

// Panel de la ficha: editar datos (solo importados sin cuenta activa) y
// quitar/restaurar de la lista.
export function PatientAdminPanel({
  patientId,
  canEdit,
  hidden,
  initial,
}: {
  patientId: string;
  canEdit: boolean;
  hidden: boolean;
  initial: { name: string; email: string; phone: string };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSave() {
    setBusy(true);
    setMsg(null);
    const res = await updateImportedPatient({ patientId, name, email, phone });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      setMsg({ ok: true, text: "Datos guardados." });
      router.refresh();
    } else setMsg({ ok: false, text: res.error });
  }

  async function onHide() {
    if (!window.confirm("¿Quitar a este paciente de tu lista? No se borra nada: podrás restaurarlo cuando quieras.")) return;
    setBusy(true);
    const res = await hidePatientFromList(patientId);
    setBusy(false);
    if (res.ok) router.push("/dashboard/pacientes");
    else setMsg({ ok: false, text: res.error });
  }

  async function onRestore() {
    setBusy(true);
    const res = await restorePatientToList(patientId);
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Paciente restaurado en tu lista." });
      router.refresh();
    } else setMsg({ ok: false, text: res.error });
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      {editing ? (
        <div className="space-y-2">
          <label className="block text-[0.8rem] text-[#5A665F]">
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-lemy mt-1 w-full" />
          </label>
          <label className="block text-[0.8rem] text-[#5A665F]">
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-lemy mt-1 w-full" />
          </label>
          <label className="block text-[0.8rem] text-[#5A665F]">
            Teléfono
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-lemy mt-1 w-full" />
          </label>
          <p className="text-[0.75rem] text-[#8B978F]">
            Si cambias el correo, cualquier invitación anterior se descarta y podrás invitarlo de nuevo al correo correcto.
          </p>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" disabled={busy} onClick={onSave}>
              {busy ? "Guardando…" : "Guardar datos"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-forest/30 px-4 py-1.5 text-[0.82rem] font-medium text-forest transition-all duration-150 hover:bg-forest/[0.06]"
            >
              Editar datos
            </button>
          )}
          {hidden ? (
            <button
              type="button"
              disabled={busy}
              onClick={onRestore}
              className="rounded-full border border-forest/30 px-4 py-1.5 text-[0.82rem] font-medium text-forest transition-all duration-150 hover:bg-forest/[0.06]"
            >
              Restaurar en mi lista
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onHide}
              className="rounded-full border border-rose-deep/40 px-4 py-1.5 text-[0.82rem] font-medium text-rose-deep transition-all duration-150 hover:bg-rose/10"
            >
              Quitar de mi lista
            </button>
          )}
        </div>
      )}
      {!canEdit && !editing && (
        <p className="mt-2 text-[0.75rem] text-[#8B978F]">
          Los datos de contacto de este paciente son de su propia cuenta de Lemy, así que no se pueden editar desde aquí.
        </p>
      )}
      {msg && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-[0.82rem] ${msg.ok ? "bg-forest/[0.06] text-forest" : "bg-rose/10 text-rose-deep"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

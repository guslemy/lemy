"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { queueInvitations } from "./importar/actions";

export type PatientListItem = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  lastAppointmentLabel: string | null;
  imported: boolean;
  activated: boolean;
  closed: boolean;
};

export type InviteCandidate = { id: string; name: string; email: string };

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Quita acentos y mayúsculas para que "jose" encuentre "José".
function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function PatientsList({
  patients,
  inviteCandidates,
  alreadyInvited,
}: {
  patients: PatientListItem[];
  inviteCandidates: InviteCandidate[];
  alreadyInvited: number;
}) {
  const [query, setQuery] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return patients;
    const qDigits = q.replace(/\D/g, "");
    return patients.filter((p) => {
      if (norm(p.fullName).includes(q)) return true;
      if (p.email && norm(p.email).includes(q)) return true;
      if (p.notes && norm(p.notes).includes(q)) return true;
      if (qDigits.length >= 3 && p.phone && p.phone.replace(/\D/g, "").includes(qDigits)) return true;
      return false;
    });
  }, [patients, query]);

  const pending = inviteCandidates.filter((c) => !sentIds.has(c.id));

  async function onInvite() {
    setBusy(true);
    const ids = [...sel];
    const res = await queueInvitations(ids);
    setBusy(false);
    setSentIds((s) => new Set([...s, ...ids]));
    setSel(new Set());
    setMsg(
      `Listo: ${res.queued} invitación(es) en cola${res.skipped ? ` (${res.skipped} no se pudieron encolar)` : ""}. ` +
        "Se envían de a poco para no saturar el correo; lo que no salga hoy sigue automáticamente mañana."
    );
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, teléfono, correo o palabras de tus notas…"
          className="input-lemy min-w-[260px] flex-1"
        />
        {inviteCandidates.length > 0 || alreadyInvited > 0 ? (
          <button
            type="button"
            onClick={() => setShowInvite((v) => !v)}
            className="cursor-pointer rounded-full border border-forest/30 px-4 py-1.5 text-[0.85rem] font-medium text-forest hover:bg-forest/[0.06]"
          >
            Invitar a mis pacientes a Lemy{pending.length > 0 ? ` (${pending.length})` : ""}
          </button>
        ) : null}
      </div>

      {showInvite && (
        <div className="mt-4 rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-[1.1rem] text-forest">Invitar a mis pacientes a registrarse en Lemy</h2>
          <p className="mt-1.5 text-[0.85rem] text-[#3E4B44]">
            Marca a quienes quieras invitar. Les llegará un correo para que creen su cuenta y puedan agendar contigo. Solo aparecen
            pacientes importados con correo, que no son menores de edad y a quienes aún no invitaste.
          </p>
          {alreadyInvited > 0 && (
            <p className="mt-1 text-[0.8rem] text-[#7C877F]">Ya invitaste a {alreadyInvited} paciente(s).</p>
          )}
          {pending.length === 0 ? (
            <p className="mt-3 text-[0.85rem] text-[#7C877F]">No tienes pacientes pendientes de invitar.</p>
          ) : (
            <>
              <div className="mt-3 flex gap-3 text-[0.8rem]">
                <button type="button" className="cursor-pointer underline" onClick={() => setSel(new Set(pending.map((c) => c.id)))}>
                  Todos
                </button>
                <button type="button" className="cursor-pointer underline" onClick={() => setSel(new Set())}>
                  Ninguno
                </button>
              </div>
              <ul className="mt-2 max-h-[320px] overflow-y-auto rounded-xl border border-line">
                {pending.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 border-b border-line/60 px-3 py-2 text-[0.85rem] last:border-0">
                    <input
                      type="checkbox"
                      checked={sel.has(c.id)}
                      onChange={(e) =>
                        setSel((s) => {
                          const next = new Set(s);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          return next;
                        })
                      }
                      className="h-4 w-4 cursor-pointer accent-forest"
                    />
                    <span className="text-forest">{c.name}</span>
                    <span className="text-[#8B978F]">{c.email}</span>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="primary" className="mt-3" disabled={busy || sel.size === 0} onClick={onInvite}>
                {busy ? "Enviando…" : `Enviar invitación a ${sel.size} paciente(s)`}
              </Button>
            </>
          )}
          {msg && <p className="mt-3 rounded-xl bg-forest/[0.06] px-3 py-2 text-[0.85rem] text-forest">{msg}</p>}
        </div>
      )}

      {query.trim() && (
        <p className="mt-3 text-[0.82rem] text-[#7C877F]">
          {filtered.length} resultado(s) de {patients.length}.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="mt-6 text-[0.95rem] text-[#3E4B44]">No encontramos pacientes con esa búsqueda.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((p, i) => (
            <Link
              key={p.id}
              href={`/dashboard/pacientes/${p.id}`}
              className={`signature-corner flex items-center gap-4 rounded-[22px] border border-line bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-signature)] ${
                p.closed ? "opacity-75" : ""
              }`}
            >
              <div
                className="flex h-11 w-11 flex-none items-center justify-center rounded-full font-display text-[0.95rem] font-semibold text-white"
                style={{
                  background: p.closed
                    ? "linear-gradient(135deg,#9AA39D,#7C877F)"
                    : i % 3 === 0
                      ? "linear-gradient(135deg,#3E6B54,var(--forest))"
                      : i % 3 === 1
                        ? "linear-gradient(135deg,var(--rose),var(--rose-deep))"
                        : "linear-gradient(135deg,#B99433,#8E7124)",
                }}
              >
                {initialsFrom(p.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-forest">{p.fullName}</p>
                <p className="text-[0.8rem] text-[#7C877F]">
                  {p.lastAppointmentLabel ? `Última cita: ${p.lastAppointmentLabel}` : "Sin citas confirmadas"}
                  {p.imported && !p.closed && (
                    <span className="text-[#8B978F]">
                      {" · "}
                      Importado · {p.activated ? "cuenta activa" : "sin cuenta activa"}
                    </span>
                  )}
                </p>
              </div>
              <span className="flex-none text-[0.82rem] font-semibold text-rose-deep">Ver ficha →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

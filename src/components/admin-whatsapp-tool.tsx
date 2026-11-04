"use client";

import { useMemo, useState } from "react";
import {
  WA_TEMPLATES,
  WA_FREE_TEMPLATE_NAME,
  WA_BETA_NOTE,
  fillTemplate,
  waDigits,
  waLink,
} from "@/lib/whatsapp-templates";

// Herramienta del panel de admin para mandar avisos de WhatsApp A MANO durante
// la fase beta: eliges plantilla, buscas a la persona, se autorrellenan su
// nombre y su teléfono, completas lo que falte y "Abrir en WhatsApp" abre el
// chat con el mensaje ya escrito (link wa.me). Quien da el clic final en
// "Enviar" es una persona, desde su propio WhatsApp.

export type WaUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

const ROLE_LABEL: Record<string, string> = { patient: "Paciente", therapist: "Terapeuta" };

export function AdminWhatsappTool({ users }: { users: WaUser[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WaUser | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [templateName, setTemplateName] = useState(WA_TEMPLATES[0].name);
  const [values, setValues] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");
  const [includeBeta, setIncludeBeta] = useState(true);
  const [copied, setCopied] = useState(false);

  const isFree = templateName === WA_FREE_TEMPLATE_NAME;
  const template = WA_TEMPLATES.find((t) => t.name === templateName) ?? null;

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2 || selected) return [];
    const qDigits = q.replace(/\D/g, "");
    return users
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (qDigits.length >= 3 && (u.phone ?? "").replace(/\D/g, "").includes(qDigits))
      )
      .slice(0, 8);
  }, [search, users, selected]);

  const pick = (u: WaUser) => {
    setSelected(u);
    setSearch("");
    setPhoneInput(u.phone ?? "");
  };

  const clear = () => {
    setSelected(null);
    setPhoneInput("");
  };

  // Valor de cada variable: lo que escribió quien usa la herramienta, o — si es
  // el nombre de quien recibe — el del usuario elegido.
  const paramValues = (template?.params ?? []).map((p) => {
    const typed = values[`${templateName}:${p.key}`];
    if (typed !== undefined) return typed;
    return p.kind === "recipient_name" ? (selected?.name ?? "") : "";
  });

  const body = isFree ? freeText : fillTemplate(template?.body ?? "", paramValues);
  const message = body + (includeBeta && body.trim() ? `\n\n${WA_BETA_NOTE}` : "");
  const missingVars = !isFree && /\{\{\d+\}\}/.test(body);
  const digits = waDigits(phoneInput);
  const link = digits && body.trim() && !missingVars ? waLink(phoneInput, message) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* si el navegador no deja copiar, queda el texto visible para copiarlo a mano */
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-[0.9rem] text-[#3E4B44]">
        Para mandar un aviso de WhatsApp a mano durante la fase beta. Se abre el chat con el mensaje
        ya escrito y tú das el clic final en &quot;Enviar&quot; desde tu WhatsApp.
      </p>

      {/* 1. Destinatario */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <h3 className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">1. ¿A quién?</h3>
        {selected ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-forest/[0.05] px-4 py-3">
            <div>
              <p className="text-[0.95rem] font-medium text-forest">{selected.name || selected.email}</p>
              <p className="text-[0.8rem] text-[#5A665F]">
                {ROLE_LABEL[selected.role] ?? selected.role} · {selected.email}
              </p>
            </div>
            <button
              type="button"
              onClick={clear}
              className="rounded-full border border-forest/30 px-4 py-1.5 text-[0.8rem] font-medium text-forest hover:bg-forest/[0.06]"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="relative mt-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Busca por nombre, correo o teléfono…"
              className="input-lemy"
            />
            {matches.length > 0 && (
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                {matches.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => pick(u)}
                      className="block w-full px-4 py-2.5 text-left hover:bg-forest/[0.05]"
                    >
                      <span className="text-[0.9rem] text-forest">{u.name || u.email}</span>
                      <span className="ml-2 text-[0.78rem] text-[#8B978F]">
                        {ROLE_LABEL[u.role] ?? u.role} · {u.phone || "sin teléfono"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {search.trim().length >= 2 && matches.length === 0 && (
              <p className="mt-2 text-[0.8rem] text-[#8B978F]">Sin coincidencias.</p>
            )}
          </div>
        )}

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">
            Teléfono de WhatsApp (se llena solo; puedes corregirlo o escribirlo a mano)
          </span>
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="9511234567"
            className="input-lemy w-[240px]"
          />
          {phoneInput && !digits && <span className="ml-2 text-[0.8rem] text-rose-deep">Número no válido</span>}
          {digits && digits.length < 12 && (
            <span className="ml-2 text-[0.8rem] text-rose-deep">Parece incompleto (México: 10 dígitos)</span>
          )}
        </label>
      </section>

      {/* 2. Plantilla */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <h3 className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">2. ¿Qué mensaje?</h3>
        <select
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="input-lemy mt-3"
        >
          {WA_TEMPLATES.map((t) => (
            <option key={t.name} value={t.name}>
              {t.label} — {t.audience === "ambos" ? "ambos" : t.audience}
            </option>
          ))}
          <option value={WA_FREE_TEMPLATE_NAME}>Mensaje libre (escribir desde cero)</option>
        </select>

        {isFree ? (
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={4}
            placeholder="Escribe tu mensaje…"
            className="input-lemy mt-3"
          />
        ) : (
          template && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {template.params.map((p, i) => (
                <label key={p.key} className="block">
                  <span className="mb-1.5 block text-[0.8rem] font-medium text-forest">
                    {`{{${i + 1}}}`} {p.label}
                  </span>
                  <input
                    type="text"
                    value={paramValues[i]}
                    onChange={(e) => setValues((v) => ({ ...v, [`${templateName}:${p.key}`]: e.target.value }))}
                    placeholder={p.placeholder ?? ""}
                    className="input-lemy"
                  />
                </label>
              ))}
            </div>
          )
        )}
      </section>

      {/* 3. Vista previa y envío */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <h3 className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">3. Vista previa</h3>
        <div className="mt-3 whitespace-pre-wrap rounded-xl bg-[#e7f3e4] px-4 py-3 text-[0.9rem] text-[#1F2A22]">
          {message.trim() ? message : "El mensaje aparecerá aquí."}
        </div>

        <label className="mt-3 flex items-center gap-2.5 text-[0.85rem] text-[#3E4B44]">
          <input
            type="checkbox"
            checked={includeBeta}
            onChange={(e) => setIncludeBeta(e.target.checked)}
            className="h-4 w-4 accent-forest"
          />
          Agregar aviso de fase beta y cómo darse de baja
        </label>

        {missingVars && (
          <p className="mt-3 text-[0.8rem] text-rose-deep">Faltan variables por llenar ({"{{…}}"} en el mensaje).</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-sage-white hover:bg-forest-deep"
            >
              Abrir en WhatsApp →
            </a>
          ) : (
            <span
              aria-disabled="true"
              className="rounded-full bg-forest/40 px-6 py-2.5 text-sm font-semibold text-sage-white"
            >
              Abrir en WhatsApp →
            </span>
          )}
          <button
            type="button"
            onClick={copy}
            disabled={!message.trim()}
            className="rounded-full border border-forest/30 px-5 py-2.5 text-sm font-medium text-forest hover:bg-forest/[0.06] disabled:opacity-50"
          >
            {copied ? "¡Copiado!" : "Copiar mensaje"}
          </button>
        </div>
        {!link && (
          <p className="mt-2 text-[0.78rem] text-[#8B978F]">
            Para activar el botón: elige a alguien (o escribe un teléfono válido) y llena todas las variables.
          </p>
        )}
      </section>
    </div>
  );
}

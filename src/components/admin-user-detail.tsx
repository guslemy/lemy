import type { ReactNode } from "react";
import Link from "next/link";
import type { UserDetail } from "@/lib/admin-user-detail";

// Ficha de un usuario en el panel de admin. Solo lectura. No muestra nada
// clínico (notas, expediente, evaluaciones): ver comentario en
// src/lib/admin-user-detail.ts.

const TZ = "America/Mexico_City";
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium", timeZone: TZ }) : "—";
const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: TZ }) : "—";
const money = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

const ROLE_LABEL: Record<string, string> = { patient: "Paciente", therapist: "Terapeuta", admin: "Admin" };
const SUB_LABEL: Record<string, string> = {
  active: "Activa",
  trialing: "Prueba",
  past_due: "Pago atrasado",
  canceled: "Cancelada",
  inactive: "Sin suscripción",
};
const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pago pendiente",
  pending: "Pendiente de confirmar",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "Inasistencia",
};
const VERIF_LABEL: Record<string, string> = { verified: "Verificado", pending: "Pendiente", rejected: "Rechazado" };
const CHANNEL_LABEL: Record<string, string> = {
  email: "Correo",
  in_app: "En la app",
  push: "Notificación push",
  whatsapp: "WhatsApp",
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h3 className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">{title}</h3>
      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[0.72rem] text-[#8B978F]">{label}</p>
      <div className="text-[0.9rem] text-forest">{children}</div>
    </div>
  );
}

export function AdminUserDetail({ data, backHref }: { data: UserDetail; backHref: string }) {
  const t = data.therapist;
  const pt = data.patient;
  const a = data.appointments;

  return (
    <div className="mt-6 space-y-4 rounded-[24px] border border-forest/20 bg-sage-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">Ficha de usuario</p>
          <h2 className="mt-1 font-display text-[1.5rem] font-medium text-forest">
            {data.fullName || t?.displayName || data.email}
          </h2>
          <p className="text-[0.85rem] text-[#5A665F]">
            {ROLE_LABEL[data.role] ?? data.role}
            {data.deactivatedAt && <span className="text-rose-deep"> · Cuenta desactivada</span>}
            {data.accountClosedAt && <span className="text-rose-deep"> · Cuenta cerrada</span>}
          </p>
        </div>
        <Link
          href={backHref}
          className="rounded-full border border-forest/30 px-4 py-1.5 text-[0.8rem] font-medium text-forest hover:bg-forest/[0.06]"
        >
          Cerrar ficha
        </Link>
      </div>

      <Card title="Cuenta">
        <Item label="Correo">{data.email || "—"}</Item>
        <Item label="Ingresa con">{data.loginMethod}</Item>
        <Item label="Teléfono">{data.phone || "—"}</Item>
        <Item label="Se registró">{fmtDate(data.createdAt)}</Item>
        <Item label="Último acceso">{fmtDateTime(data.lastSignInAt)}</Item>
        <Item label="Avisos">
          Correo/WhatsApp {data.emailWhatsappEnabled === false ? "apagado" : "encendido"} · Push{" "}
          {data.pushEnabled === false ? "apagado" : "encendido"}
        </Item>
      </Card>

      {t && (
        <>
          <Card title="Suscripción y verificación">
            <Item label="Plan">
              {SUB_LABEL[t.subscriptionStatus ?? "inactive"] ?? "—"}
              {t.subscriptionPlan ? ` (${t.subscriptionPlan})` : ""}
            </Item>
            <Item label="Prueba gratis termina">{fmtDate(t.trialEndsAt)}</Item>
            <Item label="Próxima renovación">{fmtDate(t.periodEnd)}</Item>
            <Item label="Verificación">
              {VERIF_LABEL[t.verificationStatus] ?? t.verificationStatus}
              {t.verifiedAt ? ` (${fmtDate(t.verifiedAt)})` : ""}
            </Item>
            <Item label="Documentos subidos">{t.documentsUploaded.length ? t.documentsUploaded.join(", ") : "Ninguno"}</Item>
            <Item label="Cobro con tarjeta (Stripe Connect)">{t.stripeConnectEnabled ? "Conectado" : "No conectado"}</Item>
          </Card>

          <Card title="Perfil y herramientas">
            <Item label="Perfil público">
              {t.isPublished ? (
                <Link href={`/${t.slug}`} className="underline">
                  Publicado (/{t.slug})
                </Link>
              ) : (
                "Sin publicar"
              )}
            </Item>
            <Item label="Ciudad">{t.city || "—"}</Item>
            <Item label="Perfil completo">
              {t.profileChecklist.map((c) => (
                <span key={c.label} className={`mr-2 ${c.ok ? "text-forest" : "text-rose-deep"}`}>
                  {c.ok ? "✓" : "✗"} {c.label}
                </span>
              ))}
            </Item>
            <Item label="Google Calendar">
              {t.calendarConnected
                ? t.calendarFreebusyOk === false
                  ? "Conectado, pero sin permiso de disponibilidad (debe reconectar)"
                  : "Conectado"
                : "No conectado"}
            </Item>
          </Card>
        </>
      )}

      <Card title="Citas">
        <Item label="Total">{a.total}</Item>
        <Item label="Realizadas (confirmadas o completadas, ya pasadas)">{a.held}</Item>
        <Item label="Próximas confirmadas">
          {a.upcoming}
          {a.nextAt ? ` · la siguiente: ${fmtDateTime(a.nextAt)}` : ""}
        </Item>
        <Item label="Por estado">
          {a.byStatus.length
            ? a.byStatus.map((s) => `${STATUS_LABEL[s.status] ?? s.status}: ${s.count}`).join(" · ")
            : "—"}
        </Item>
        <Item label="Modalidad">
          En línea {a.online} · Presencial {a.inPerson}
        </Item>
        <Item label="Primera / última realizada">
          {fmtDate(a.firstAt)} / {fmtDate(a.lastAt)}
        </Item>
      </Card>

      {t && (
        <Card title="Pacientes e ingresos">
          <Item label="Pacientes distintos">{t.distinctPatients}</Item>
          <Item label="Pacientes que regresaron (2 o más citas)">{t.returningPatients}</Item>
          <Item label="Cobrado con tarjeta (realizadas)">{money(t.income)}</Item>
          <Item label="Acordado en efectivo (realizadas)">{money(t.cashIncome)}</Item>
          <Item label="Comisión para Lemy">{money(t.commissionToLemy)}</Item>
          <Item label="Canceladas / inasistencias">
            {t.cancelledCount} / {t.noShowCount}
          </Item>
          <Item label="Reseñas">
            {t.reviewsCount}
            {t.avgRating !== null ? ` · promedio ${t.avgRating.toFixed(1)} ★` : ""}
          </Item>
        </Card>
      )}

      {pt && (
        <Card title="Como paciente">
          <Item label="Terapeutas con los que ha ido">
            {pt.therapistsSeen.length
              ? pt.therapistsSeen.map((x) => `${x.name} (${x.count})`).join(" · ")
              : "Ninguno todavía"}
          </Item>
          <Item label="Canceladas / inasistencias">
            {pt.cancelledCount} / {pt.noShowCount}
          </Item>
          <Item label="Reseñas que dejó">{pt.reviewsWritten}</Item>
        </Card>
      )}

      <Card title="Comunicaciones recibidas">
        <Item label="Por canal">
          {data.communications.byChannel.length
            ? data.communications.byChannel
                .map((c) => `${CHANNEL_LABEL[c.channel] ?? c.channel}: ${c.count}`)
                .join(" · ")
            : "Ninguna"}
        </Item>
        <Item label="Correos guardados en el historial">{data.communications.totalEmails}</Item>
        {data.communications.recentEmails.length > 0 && (
          <div className="sm:col-span-2">
            <p className="text-[0.72rem] text-[#8B978F]">Últimos correos</p>
            <ul className="mt-1 space-y-1 text-[0.85rem] text-[#3E4B44]">
              {data.communications.recentEmails.map((e) => (
                <li key={`${e.sentAt}-${e.subject}`}>
                  {fmtDateTime(e.sentAt)} — {e.subject}{" "}
                  <span className="text-[#8B978F]">({e.type})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

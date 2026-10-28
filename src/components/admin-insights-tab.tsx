import Link from "next/link";
import type { ReactNode } from "react";
import { PLAN_PRICE_MXN, type Cmp, type InsightsData } from "@/lib/admin-insights";

// Pestaña "Insights" del panel de admin: KPIs para dirección. Server
// component puro (sin JS de cliente): el periodo y el interruptor de cuentas
// de prueba son links que recargan la página con otros parámetros.

const money = (n: number | null) => (n === null ? "—" : `$${Math.round(n).toLocaleString("es-MX")}`);
const int = (n: number | null) => (n === null ? "—" : Math.round(n).toLocaleString("es-MX"));
const dec = (n: number | null) => (n === null ? "—" : n.toLocaleString("es-MX", { maximumFractionDigits: 1 }));
const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

const CHANNEL_LABEL: Record<string, string> = {
  email: "Correo",
  in_app: "Dentro de la app",
  push: "Notificación push",
  whatsapp: "WhatsApp",
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pago pendiente",
  pending_patient_acceptance: "Esperando al paciente",
  confirmed: "Confirmadas",
  completed: "Completadas",
  cancelled: "Canceladas",
  no_show: "No se presentó",
};

function Delta({ c, money: isMoney = false }: { c: Cmp; money?: boolean }) {
  if (c.prev === null) return null;
  const diff = c.cur - c.prev;
  if (c.prev === 0 && c.cur === 0) return <span className="text-[0.72rem] text-[#9AA59D]">sin cambio</span>;
  if (c.prev === 0) return <span className="text-[0.72rem] font-medium text-forest">nuevo</span>;
  const p = Math.round((diff / c.prev) * 100);
  const cls = diff > 0 ? "text-forest" : diff < 0 ? "text-rose-deep" : "text-[#9AA59D]";
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "•";
  return (
    <span className={`text-[0.72rem] font-medium ${cls}`}>
      {arrow} {Math.abs(p)}% <span className="font-normal text-[#9AA59D]">vs periodo anterior ({isMoney ? money(c.prev) : int(c.prev)})</span>
    </span>
  );
}

function Kpi({
  label,
  value,
  cmp,
  isMoney,
  hint,
}: {
  label: string;
  value: string;
  cmp?: Cmp;
  isMoney?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card px-5 py-4" title={hint}>
      <p className="text-[0.72rem] uppercase tracking-[0.06em] text-[#7C877F]">{label}</p>
      <p className="mt-1 font-display text-[1.7rem] font-medium leading-tight text-forest">{value}</p>
      <div className="mt-1 min-h-[1rem]">{cmp ? <Delta c={cmp} money={isMoney} /> : null}</div>
      {hint && <p className="mt-1 text-[0.72rem] leading-snug text-[#9AA59D]">{hint}</p>}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">{title}</h2>
      {note && <p className="mt-1 text-[0.8rem] text-[#7C877F]">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Bars({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  return (
    <div>
      <div className="flex h-24 items-end gap-[2px]">
        {values.map((v, i) => (
          <div
            key={labels[i]}
            title={`${labels[i]}: ${v}`}
            className={`flex-1 rounded-t-sm ${color}`}
            style={{ height: `${Math.max(v > 0 ? 6 : 1, (v / max) * 100)}%`, opacity: v > 0 ? 1 : 0.25 }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.68rem] text-[#9AA59D]">
        <span>{labels[0]}</span>
        <span>máx. {max}/día</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

function FunnelRow({ label, value, base }: { label: string; value: number; base: number }) {
  const w = base ? Math.round((value / base) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-[0.85rem]">
      <span className="w-44 flex-none text-[#3E4B44]">{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded-full bg-forest/[0.06]">
        <div className="h-full rounded-full bg-forest/70" style={{ width: `${Math.max(w, value > 0 ? 2 : 0)}%` }} />
      </div>
      <span className="w-20 flex-none text-right font-medium text-forest">
        {value} <span className="font-normal text-[#9AA59D]">({w}%)</span>
      </span>
    </div>
  );
}

const PERIODS: { key: string; label: string }[] = [
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
  { key: "todo", label: "Todo" },
];

export function AdminInsightsTab({ data, periodKey }: { data: InsightsData; periodKey: string }) {
  const { users, funnel, subscriptions: sub, appointments: ap, revenue: rev, communications: com, quality: q } = data;
  const periodLabel = data.days ? `últimos ${data.days} días` : "todo el historial";
  const href = (dias: string, pruebas: boolean) =>
    `/dashboard/admin?tab=insights&dias=${dias}${pruebas ? "&pruebas=1" : ""}`;

  return (
    <div>
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2.5">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={href(p.key, data.includeTests)}
            className={`rounded-full border px-4 py-1.5 text-[0.82rem] font-medium ${
              p.key === periodKey
                ? "border-forest bg-forest text-sage-white"
                : "border-line bg-card text-forest hover:border-forest"
            }`}
          >
            {p.label}
          </Link>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <Link
          href={href(periodKey, !data.includeTests)}
          className="rounded-full border border-line bg-card px-4 py-1.5 text-[0.82rem] font-medium text-forest hover:border-forest"
        >
          {data.includeTests ? "✓ Incluyendo cuentas de prueba" : "Incluir cuentas de prueba"}
        </Link>
      </div>
      <p className="mt-2 text-[0.78rem] text-[#7C877F]">
        Mostrando: {periodLabel}
        {data.days ? ", comparado contra el periodo anterior del mismo largo" : ""}.{" "}
        {data.includeTests
          ? "Las cuentas de prueba están incluidas."
          : `Se excluyen ${data.excludedAccounts} cuenta${data.excludedAccounts === 1 ? "" : "s"} de prueba.`}{" "}
        Actualizado {new Date(data.generatedAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short", timeZone: "America/Mexico_City" })}.
      </p>

      {/* Revenue */}
      <Section
        title="Revenue de Lemy"
        note={`Estimado a precio de lista (Empieza $${PLAN_PRICE_MXN.base} y Gestiona $${PLAN_PRICE_MXN.plus} al mes), sin descuentos de referidos ni miembros fundadores. La comisión es la de las citas pagadas con tarjeta.`}
      >
        <Grid>
          <Kpi label="Ingreso mensual recurrente (MRR)" value={money(rev.mrr)} hint="Suscripciones activas hoy × precio de lista." />
          <Kpi
            label={`Revenue estimado (${periodLabel})`}
            value={data.days ? money(rev.estimatedLemyRevenue.cur) : "—"}
            cmp={data.days ? rev.estimatedLemyRevenue : undefined}
            isMoney
            hint={data.days ? "MRR prorrateado al periodo + comisiones." : "Elige un periodo para estimarlo."}
          />
          <Kpi label="Comisión por citas con tarjeta" value={money(rev.commission.cur)} cmp={rev.commission} isMoney hint="$5 + 3% por cada consulta realizada y pagada con tarjeta." />
          <Kpi label="Valor de las consultas (GMV)" value={money(rev.gmv.cur)} cmp={rev.gmv} isMoney hint="Dinero que mueven los terapeutas (tarjeta + efectivo) en consultas realizadas." />
          <Kpi label="Ingreso promedio por terapeuta" value={money(rev.avgGmvPerActiveTherapist)} hint="GMV ÷ terapeutas con al menos una consulta realizada." />
          <Kpi label="Ingreso de Lemy por terapeuta suscrito" value={money(rev.arpt)} hint="Revenue estimado ÷ terapeutas con suscripción activa." />
        </Grid>
        <p className="mt-2 text-[0.78rem] text-[#7C877F]">
          Consultas pagadas con tarjeta: {pct(rev.cardShare)} (el resto, efectivo).
        </p>
      </Section>

      {/* Usuarios */}
      <Section title="Usuarios" note="Activo por inicio de sesión: entró en los últimos 30 días. Activo real: tuvo al menos una consulta realizada en el periodo.">
        <Grid>
          <Kpi label="Pacientes registrados" value={int(users.totalPatients)} />
          <Kpi label="Terapeutas registrados" value={int(users.totalTherapists)} />
          <Kpi label="Altas nuevas de pacientes" value={int(users.newPatients.cur)} cmp={users.newPatients} />
          <Kpi label="Altas nuevas de terapeutas" value={int(users.newTherapists.cur)} cmp={users.newTherapists} />
          <Kpi label="Activos por inicio de sesión (30 d)" value={`${int(users.loginActive30.patients)} pac. · ${int(users.loginActive30.therapists)} ter.`} />
          <Kpi
            label="Activos reales"
            value={`${int(users.realActive.patients.cur)} pac. · ${int(users.realActive.therapists.cur)} ter.`}
            cmp={{ cur: users.realActive.patients.cur + users.realActive.therapists.cur, prev: users.realActive.patients.prev === null ? null : (users.realActive.patients.prev ?? 0) + (users.realActive.therapists.prev ?? 0) }}
          />
        </Grid>
      </Section>

      {/* Embudo */}
      <Section title="Embudo de terapeutas" note="Cuántos avanzan en cada etapa, sobre el total de registrados.">
        <div className="space-y-2.5 rounded-2xl border border-line bg-card px-5 py-4">
          <FunnelRow label="Registrados" value={funnel.registered} base={funnel.registered} />
          <FunnelRow label="Perfil publicado" value={funnel.published} base={funnel.registered} />
          <FunnelRow label="Verificados" value={funnel.verified} base={funnel.registered} />
          <FunnelRow label="Con suscripción activa" value={funnel.subscribed} base={funnel.registered} />
          <FunnelRow label="Con consultas en el periodo" value={funnel.withConsultations} base={funnel.registered} />
        </div>
      </Section>

      {/* Suscripciones */}
      <Section title="Suscripciones">
        <Grid>
          <Kpi label="Activas · Empieza" value={int(sub.activeBase)} />
          <Kpi label="Activas · Gestiona" value={int(sub.activePlus)} />
          <Kpi label="En periodo de prueba" value={int(sub.inTrial)} />
          <Kpi label="Prueba vencida sin plan" value={int(sub.trialExpiredNoPlan)} hint="Candidatos a recuperar." />
          <Kpi label="Pago atrasado" value={int(sub.pastDue)} />
          <Kpi label="Canceladas" value={int(sub.canceled)} />
          <Kpi label="Conversión de prueba a plan" value={pct(sub.trialConversionRate)} hint="De quienes ya terminaron su prueba, % con plan." />
        </Grid>
      </Section>

      {/* Citas */}
      <Section title="Consultas" note="Realizada = confirmada o completada, con fecha ya pasada.">
        <Grid>
          <Kpi label="Citas agendadas" value={int(ap.booked.cur)} cmp={ap.booked} />
          <Kpi label="Consultas realizadas" value={int(ap.held.cur)} cmp={ap.held} />
          <Kpi label="Promedio por terapeuta activo" value={dec(ap.avgPerActiveTherapist)} hint="Consultas realizadas ÷ terapeutas con al menos una." />
          <Kpi label="Promedio por paciente activo" value={dec(ap.avgPerActivePatient)} />
          <Kpi label="Tasa de cancelación" value={pct(ap.cancelRate)} hint="Canceladas ÷ agendadas en el periodo." />
          <Kpi label="Inasistencias (no show)" value={pct(ap.noShowRate)} />
          <Kpi label="Pacientes que regresan" value={pct(ap.repeatPatientRate)} hint="Con 2 o más consultas realizadas (histórico)." />
          <Kpi label="En línea / presencial" value={`${int(ap.online)} / ${int(ap.inPerson)}`} />
        </Grid>
        {ap.byStatus.length > 0 && (
          <p className="mt-2 text-[0.8rem] text-[#7C877F]">
            Citas del periodo por estado:{" "}
            {ap.byStatus.map((s) => `${STATUS_LABEL[s.status] ?? s.status}: ${s.count}`).join(" · ")}
          </p>
        )}
      </Section>

      {/* Tendencias */}
      <Section title="Tendencias diarias" note="Últimos días (máximo 90).">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card px-5 py-4">
            <p className="mb-2 text-[0.8rem] font-medium text-forest">Altas nuevas por día</p>
            <Bars labels={data.series.labels} values={data.series.signups} color="bg-forest/70" />
          </div>
          <div className="rounded-2xl border border-line bg-card px-5 py-4">
            <p className="mb-2 text-[0.8rem] font-medium text-forest">Citas agendadas por día</p>
            <Bars labels={data.series.labels} values={data.series.appointments} color="bg-rose-deep/70" />
          </div>
        </div>
      </Section>

      {/* Comunicaciones */}
      <Section title="Comunicaciones enviadas" note="Registros de envío por canal. Un mismo aviso puede contar en más de un canal.">
        <Grid>
          <Kpi label="Total de comunicaciones" value={int(com.total.cur)} cmp={com.total} />
          {com.byChannel.map((c) => (
            <Kpi
              key={c.channel}
              label={CHANNEL_LABEL[c.channel] ?? c.channel}
              value={int(c.cur)}
              cmp={{ cur: c.cur, prev: c.prev }}
            />
          ))}
          <Kpi label="Por usuario activo real" value={dec(com.perActiveUser)} />
        </Grid>
        {com.emailsByType.length > 0 && (
          <div className="mt-3 rounded-2xl border border-line bg-card px-5 py-4">
            <p className="mb-2 text-[0.8rem] font-medium text-forest">Correos más enviados</p>
            <ul className="space-y-1 text-[0.82rem] text-[#3E4B44]">
              {com.emailsByType.map((e) => (
                <li key={e.type} className="flex justify-between gap-3">
                  <span>{e.type}</span>
                  <span className="font-medium text-forest">{e.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Calidad */}
      <Section title="Calidad y operación">
        <Grid>
          <Kpi label="Calificación promedio" value={q.avgRating === null ? "—" : dec(q.avgRating)} hint="De 1 a 5, con las reseñas del periodo (o históricas si no hay)." />
          <Kpi label="Reseñas recibidas" value={int(q.reviewsCount.cur)} cmp={q.reviewsCount} />
          <Kpi label="Consultas con reseña" value={pct(q.reviewCoverage)} />
          <Kpi label="Terapeutas con Google Calendar" value={pct(q.calendarConnectedRate)} />
          <Kpi label="Gestiona con cobro por tarjeta listo" value={pct(q.stripeConnectRate)} hint="Plan Gestiona activo con Stripe Connect habilitado." />
          <Kpi
            label="Verificaciones esperando revisión"
            value={int(q.verificationBacklog)}
            hint={q.oldestBacklogDays !== null ? `La más antigua lleva ${q.oldestBacklogDays} día(s).` : undefined}
          />
        </Grid>
      </Section>
    </div>
  );
}

import { createServiceClient } from "@/lib/supabase/service";
import { getPendingVerifications } from "@/lib/admin-pending";

// Datos de la pestaña "Insights" del panel de admin (KPIs para dirección).
// Solo lectura, y solo se llama desde /dashboard/admin después de comprobar
// que quien pide es admin. Todo sale de la base de datos de Lemy (no llama a
// Stripe), así que los montos son ESTIMADOS a precio de lista — ver notas en
// cada KPI.

// ── Cosas que se pueden ajustar a mano ───────────────────────────────────
// Precio de lista mensual de cada plan (MXN). OJO: Stripe es la fuente real
// de los precios; si cambian allá, hay que cambiarlos aquí también. No
// incluye descuentos (referidos, miembros fundadores).
export const PLAN_PRICE_MXN = { base: 249, plus: 399 } as const;

// Cuentas de prueba: se excluyen de los números salvo que se active el
// interruptor "incluir cuentas de prueba". Se detectan por correo o nombre.
// Agrega aquí cualquier fragmento nuevo que identifique una cuenta de prueba.
export const TEST_EMAIL_DOMAINS = ["@lemy.mx"];
export const TEST_EMAIL_FRAGMENTS = ["test", "prueba", "stingray", "gztarlol"];
export const TEST_NAME_FRAGMENTS = ["(prueba)", "(test)", "prueba", "test"];

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ROWS = 50_000; // tope de seguridad por tabla al paginar

export type Cmp = { cur: number; prev: number | null };

export type InsightsData = {
  days: number | null; // null = todo el historial
  includeTests: boolean;
  excludedAccounts: number;
  generatedAt: string;

  users: {
    totalPatients: number;
    totalTherapists: number;
    newPatients: Cmp;
    newTherapists: Cmp;
    loginActive30: { patients: number; therapists: number };
    realActive: { patients: Cmp; therapists: Cmp };
  };

  funnel: {
    registered: number;
    published: number;
    verified: number;
    subscribed: number;
    withConsultations: number;
  };

  subscriptions: {
    activeBase: number;
    activePlus: number;
    pastDue: number;
    canceled: number;
    inTrial: number;
    trialExpiredNoPlan: number;
    trialConversionRate: number | null; // 0..1
    mrr: number;
  };

  appointments: {
    booked: Cmp;
    held: Cmp; // consultas realizadas (confirmadas o completadas, ya pasadas)
    cancelRate: number | null;
    noShowRate: number | null;
    online: number;
    inPerson: number;
    byStatus: { status: string; count: number }[];
    repeatPatientRate: number | null;
    avgPerActiveTherapist: number | null;
    avgPerActivePatient: number | null;
  };

  revenue: {
    mrr: number;
    commission: Cmp; // comisión por citas pagadas con tarjeta
    estimatedLemyRevenue: Cmp; // mrr prorrateado + comisión
    gmv: Cmp; // valor de las consultas realizadas (dinero que mueven los terapeutas)
    avgGmvPerActiveTherapist: number | null;
    arpt: number | null; // ingreso de Lemy por terapeuta con suscripción activa
    cardShare: number | null; // % de consultas pagadas con tarjeta
  };

  communications: {
    total: Cmp;
    byChannel: { channel: string; cur: number; prev: number | null }[];
    emailsByType: { type: string; count: number }[];
    perActiveUser: number | null;
  };

  quality: {
    avgRating: number | null;
    reviewsCount: Cmp;
    reviewCoverage: number | null; // reseñas / consultas realizadas
    calendarConnectedRate: number | null;
    stripeConnectRate: number | null; // de terapeutas con plan Gestiona activo
    verificationBacklog: number;
    oldestBacklogDays: number | null;
  };

  series: {
    labels: string[]; // YYYY-MM-DD
    signups: number[];
    appointments: number[];
  };
};

type Row = Record<string, unknown>;

// Supabase devuelve máximo 1,000 filas por consulta. Esto pagina hasta traer
// todo (con un tope de seguridad).
async function fetchAll(
  build: (from: number, to: number) => PromiseLike<{ data: Row[] | null }>
): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; from < MAX_ROWS; from += 1000) {
    const { data } = await build(from, from + 999);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
const ts = (v: unknown) => (v ? new Date(String(v)).getTime() : NaN);

export async function getInsights(params: {
  days: number | null;
  includeTests: boolean;
  authUsers: { id: string; email?: string | null; last_sign_in_at?: string | null }[];
}): Promise<InsightsData> {
  const { days, includeTests, authUsers } = params;
  const service = createServiceClient();
  const now = Date.now();

  // Ventana actual y anterior (del mismo largo) para comparar.
  const curStart = days ? now - days * DAY_MS : 0;
  const prevStart = days ? now - 2 * days * DAY_MS : null;
  const inCur = (t: number) => Number.isFinite(t) && t >= curStart && t <= now;
  const inPrev = (t: number) =>
    prevStart !== null && Number.isFinite(t) && t >= prevStart && t < curStart;
  const cmp = (cur: number, prev: number): Cmp => ({ cur, prev: days ? prev : null });

  const [profiles, therapists, appts, reviews, emailLog, notifLog] = await Promise.all([
    fetchAll((a, b) =>
      service.from("profiles").select("id, role, full_name, created_at, deactivated_at, account_closed_at").range(a, b)
    ),
    fetchAll((a, b) =>
      service
        .from("therapists")
        .select(
          "id, display_name, subscription_status, subscription_plan, trial_ends_at, is_published, verification_status, google_calendar_connected, stripe_connect_charges_enabled, created_at"
        )
        .range(a, b)
    ),
    fetchAll((a, b) =>
      service
        .from("appointments")
        .select(
          "id, therapist_id, patient_id, status, payment_status, price, application_fee_cents, modality, created_at, scheduled_at"
        )
        .range(a, b)
    ),
    fetchAll((a, b) =>
      service.from("reviews").select("rating, therapist_id, created_at").range(a, b)
    ),
    fetchAll((a, b) =>
      service
        .from("email_log")
        .select("recipient_id, notification_type, sent_at")
        .gte("sent_at", new Date(prevStart ?? curStart).toISOString())
        .range(a, b)
    ),
    fetchAll((a, b) =>
      service
        .from("notification_log")
        .select("recipient_id, channel, sent_at")
        .gte("sent_at", new Date(prevStart ?? curStart).toISOString())
        .range(a, b)
    ),
  ]);

  // ── Cuentas de prueba ────────────────────────────────────────────────
  const emailById = new Map(authUsers.map((u) => [u.id, (u.email ?? "").toLowerCase()]));
  const lastSignInById = new Map(authUsers.map((u) => [u.id, u.last_sign_in_at ?? null]));
  const nameById = new Map<string, string>();
  for (const p of profiles) nameById.set(String(p.id), String(p.full_name ?? "").toLowerCase());
  for (const t of therapists) {
    const n = String(t.display_name ?? "").toLowerCase();
    if (n) nameById.set(String(t.id), `${nameById.get(String(t.id)) ?? ""} ${n}`);
  }
  const isTestId = (id: string) => {
    const email = emailById.get(id) ?? "";
    const name = nameById.get(id) ?? "";
    return (
      TEST_EMAIL_DOMAINS.some((d) => email.endsWith(d)) ||
      TEST_EMAIL_FRAGMENTS.some((f) => email.includes(f)) ||
      TEST_NAME_FRAGMENTS.some((f) => name.includes(f))
    );
  };
  const testIds = new Set<string>();
  for (const id of new Set([...profiles.map((p) => String(p.id)), ...therapists.map((t) => String(t.id))])) {
    if (isTestId(id)) testIds.add(id);
  }
  const keep = (id: string) => includeTests || !testIds.has(id);

  const ps = profiles.filter((p) => keep(String(p.id)) && !p.account_closed_at);
  const patients = ps.filter((p) => p.role === "patient");
  const therapistProfiles = ps.filter((p) => p.role === "therapist");
  const ths = therapists.filter((t) => keep(String(t.id)));
  const therapistIds = new Set(ths.map((t) => String(t.id)));
  const as = appts.filter((a) => keep(String(a.therapist_id)) && keep(String(a.patient_id)));

  // ── Usuarios ─────────────────────────────────────────────────────────
  const created = (rows: Row[]) => ({
    cur: rows.filter((r) => inCur(ts(r.created_at))).length,
    prev: rows.filter((r) => inPrev(ts(r.created_at))).length,
  });
  const newP = created(patients);
  const newT = created(therapistProfiles);

  const d30 = now - 30 * DAY_MS;
  const loginActive = (role: string) =>
    ps.filter((p) => p.role === role && ts(lastSignInById.get(String(p.id))) >= d30).length;

  // Consultas realizadas = confirmadas o completadas cuya hora ya pasó.
  const isHeld = (a: Row) =>
    (a.status === "confirmed" || a.status === "completed") && ts(a.scheduled_at) <= now;
  const heldIn = (pred: (t: number) => boolean) => as.filter((a) => isHeld(a) && pred(ts(a.scheduled_at)));
  const heldCur = heldIn(inCur);
  const heldPrev = heldIn(inPrev);

  const distinct = (rows: Row[], key: string) => new Set(rows.map((r) => String(r[key]))).size;
  const activeTherCur = distinct(heldCur, "therapist_id");
  const activePatCur = distinct(heldCur, "patient_id");

  // ── Embudo de terapeutas ─────────────────────────────────────────────
  const subscribed = ths.filter((t) => t.subscription_status === "active");
  const funnel = {
    registered: ths.length,
    published: ths.filter((t) => t.is_published).length,
    verified: ths.filter((t) => t.verification_status === "verified").length,
    subscribed: subscribed.length,
    withConsultations: activeTherCur,
  };

  // ── Suscripciones ────────────────────────────────────────────────────
  const st = (t: Row) => String(t.subscription_status ?? "inactive");
  const activeBase = subscribed.filter((t) => t.subscription_plan !== "plus").length;
  const activePlus = subscribed.filter((t) => t.subscription_plan === "plus").length;
  const pastDue = ths.filter((t) => st(t) === "past_due").length;
  const canceled = ths.filter((t) => st(t) === "canceled").length;
  const noPlan = ths.filter((t) => !["active", "past_due", "canceled"].includes(st(t)));
  const inTrial = noPlan.filter((t) => ts(t.trial_ends_at) > now).length;
  const trialExpiredNoPlan = noPlan.filter((t) => !(ts(t.trial_ends_at) > now)).length;
  const trialEnded = ths.filter((t) => ts(t.trial_ends_at) <= now);
  const trialConverted = trialEnded.filter((t) => ["active", "past_due"].includes(st(t))).length;
  const mrr = activeBase * PLAN_PRICE_MXN.base + activePlus * PLAN_PRICE_MXN.plus;

  // ── Citas ────────────────────────────────────────────────────────────
  const bookedCur = as.filter((a) => inCur(ts(a.created_at)));
  const bookedPrev = as.filter((a) => inPrev(ts(a.created_at)));
  const cancelled = bookedCur.filter((a) => a.status === "cancelled").length;
  const noShows = as.filter((a) => a.status === "no_show" && inCur(ts(a.scheduled_at))).length;

  const statusCount = new Map<string, number>();
  for (const a of bookedCur) statusCount.set(String(a.status), (statusCount.get(String(a.status)) ?? 0) + 1);

  const heldAll = as.filter(isHeld);
  const consultsByPatient = new Map<string, number>();
  for (const a of heldAll) {
    const k = String(a.patient_id);
    consultsByPatient.set(k, (consultsByPatient.get(k) ?? 0) + 1);
  }
  const patientsWithAny = consultsByPatient.size;
  const repeatPatients = Array.from(consultsByPatient.values()).filter((n) => n >= 2).length;

  // ── Revenue ──────────────────────────────────────────────────────────
  const paidHeld = (rows: Row[]) => rows.filter((a) => a.payment_status === "paid" || a.payment_status === "efectivo");
  const gmv = (rows: Row[]) => paidHeld(rows).reduce((s, a) => s + num(a.price), 0);
  const commission = (rows: Row[]) =>
    rows
      .filter((a) => a.payment_status === "paid")
      .reduce((s, a) => s + num(a.application_fee_cents) / 100, 0);

  const commCur = commission(heldCur);
  const commPrev = commission(heldPrev);
  // MRR prorrateado al largo del periodo (30 días = 1 mes). Para "todo" solo
  // se muestra el MRR actual, sin prorrateo.
  const proCur = days ? (mrr * days) / 30 : 0;
  const gmvCur = gmv(heldCur);
  const heldPaidCur = paidHeld(heldCur);
  const cardCount = heldPaidCur.filter((a) => a.payment_status === "paid").length;

  // ── Comunicaciones ───────────────────────────────────────────────────
  const notif = notifLog.filter((r) => keep(String(r.recipient_id)));
  const emails = emailLog.filter((r) => keep(String(r.recipient_id)));
  const channels = ["email", "in_app", "push", "whatsapp"];
  const byChannel = channels.map((c) => ({
    channel: c,
    cur: notif.filter((r) => r.channel === c && inCur(ts(r.sent_at))).length,
    prev: days ? notif.filter((r) => r.channel === c && inPrev(ts(r.sent_at))).length : null,
  }));
  const totalCur = byChannel.reduce((s, c) => s + c.cur, 0);
  const totalPrev = byChannel.reduce((s, c) => s + (c.prev ?? 0), 0);
  const typeCount = new Map<string, number>();
  for (const e of emails.filter((r) => inCur(ts(r.sent_at)))) {
    typeCount.set(String(e.notification_type), (typeCount.get(String(e.notification_type)) ?? 0) + 1);
  }
  const emailsByType = Array.from(typeCount.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const activeUsersReal = activeTherCur + activePatCur;

  // ── Calidad ──────────────────────────────────────────────────────────
  const rv = reviews.filter((r) => therapistIds.has(String(r.therapist_id)));
  const rvCur = rv.filter((r) => inCur(ts(r.created_at)));
  const rvPrev = rv.filter((r) => inPrev(ts(r.created_at)));
  const avg = (rows: Row[]) => (rows.length ? rows.reduce((s, r) => s + num(r.rating), 0) / rows.length : null);
  const plusActive = ths.filter((t) => t.subscription_status === "active" && t.subscription_plan === "plus");

  // Verificaciones que ya subieron documentos y esperan revisión (mismo
  // criterio que el aviso del panel, ver lib/admin-pending.ts).
  const backlog = (await getPendingVerifications()).filter((p) => keep(p.id));

  // ── Series diarias (máx. 90 días) ────────────────────────────────────
  const span = Math.min(days ?? 90, 90);
  const labels: string[] = [];
  for (let i = span - 1; i >= 0; i--) labels.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10));
  const idx = new Map(labels.map((l, i) => [l, i]));
  const signups = labels.map(() => 0);
  const apptSeries = labels.map(() => 0);
  for (const p of ps.filter((p) => p.role === "patient" || p.role === "therapist")) {
    const i = idx.get(new Date(ts(p.created_at)).toISOString().slice(0, 10));
    if (i !== undefined) signups[i]++;
  }
  for (const a of as) {
    const i = idx.get(new Date(ts(a.created_at)).toISOString().slice(0, 10));
    if (i !== undefined) apptSeries[i]++;
  }

  return {
    days,
    includeTests,
    excludedAccounts: includeTests ? 0 : testIds.size,
    generatedAt: new Date(now).toISOString(),

    users: {
      totalPatients: patients.length,
      totalTherapists: therapistProfiles.length,
      newPatients: cmp(newP.cur, newP.prev),
      newTherapists: cmp(newT.cur, newT.prev),
      loginActive30: { patients: loginActive("patient"), therapists: loginActive("therapist") },
      realActive: {
        patients: cmp(activePatCur, distinct(heldPrev, "patient_id")),
        therapists: cmp(activeTherCur, distinct(heldPrev, "therapist_id")),
      },
    },

    funnel,

    subscriptions: {
      activeBase,
      activePlus,
      pastDue,
      canceled,
      inTrial,
      trialExpiredNoPlan,
      trialConversionRate: trialEnded.length ? trialConverted / trialEnded.length : null,
      mrr,
    },

    appointments: {
      booked: cmp(bookedCur.length, bookedPrev.length),
      held: cmp(heldCur.length, heldPrev.length),
      cancelRate: bookedCur.length ? cancelled / bookedCur.length : null,
      noShowRate: heldCur.length + noShows ? noShows / (heldCur.length + noShows) : null,
      online: bookedCur.filter((a) => a.modality === "online").length,
      inPerson: bookedCur.filter((a) => a.modality === "presencial").length,
      byStatus: Array.from(statusCount.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
      repeatPatientRate: patientsWithAny ? repeatPatients / patientsWithAny : null,
      avgPerActiveTherapist: activeTherCur ? heldCur.length / activeTherCur : null,
      avgPerActivePatient: activePatCur ? heldCur.length / activePatCur : null,
    },

    revenue: {
      mrr,
      commission: cmp(commCur, commPrev),
      estimatedLemyRevenue: cmp(proCur + commCur, days ? (mrr * days) / 30 + commPrev : 0),
      gmv: cmp(gmvCur, gmv(heldPrev)),
      avgGmvPerActiveTherapist: activeTherCur ? gmvCur / activeTherCur : null,
      arpt: subscribed.length ? (proCur + commCur) / subscribed.length : null,
      cardShare: heldPaidCur.length ? cardCount / heldPaidCur.length : null,
    },

    communications: {
      total: cmp(totalCur, totalPrev),
      byChannel,
      emailsByType,
      perActiveUser: activeUsersReal ? totalCur / activeUsersReal : null,
    },

    quality: {
      avgRating: avg(rvCur.length ? rvCur : rv),
      reviewsCount: cmp(rvCur.length, rvPrev.length),
      reviewCoverage: heldCur.length ? rvCur.length / heldCur.length : null,
      calendarConnectedRate: ths.length
        ? ths.filter((t) => t.google_calendar_connected).length / ths.length
        : null,
      stripeConnectRate: plusActive.length
        ? plusActive.filter((t) => t.stripe_connect_charges_enabled).length / plusActive.length
        : null,
      verificationBacklog: backlog.length,
      oldestBacklogDays: backlog.length
        ? Math.max(...backlog.map((p) => Math.floor((now - ts(p.submittedAt)) / DAY_MS)))
        : null,
    },

    series: { labels, signups, appointments: apptSeries },
  };
}

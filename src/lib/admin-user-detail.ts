import { createServiceClient } from "@/lib/supabase/service";

// Ficha de un usuario para el panel de admin (pestaña "Gestión de usuarios").
// Solo lectura, y solo se llama desde /dashboard/admin después de comprobar
// que quien pide es admin. Junta en un solo lugar lo que está repartido en
// varias tablas de Supabase.
//
// A propósito NO se lee nada clínico (notas, expediente, evaluaciones): está
// cifrado y son datos sensibles de salud. Solo se cuentan citas y se leen
// datos de cuenta.

type Row = Record<string, unknown>;
const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
const ms = (v: unknown) => (v ? new Date(String(v)).getTime() : NaN);

export type AdminAuthInfo = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  providers: string[];
};

export type UserDetail = {
  id: string;
  role: string;
  fullName: string | null;
  email: string;
  loginMethod: string; // "Google", "Correo y contraseña", etc.
  phone: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  deactivatedAt: string | null;
  accountClosedAt: string | null;
  pushEnabled: boolean | null;
  emailWhatsappEnabled: boolean | null;

  appointments: {
    total: number;
    byStatus: { status: string; count: number }[];
    held: number; // confirmadas o completadas con fecha ya pasada
    upcoming: number; // confirmadas con fecha futura
    online: number;
    inPerson: number;
    firstAt: string | null;
    lastAt: string | null;
    nextAt: string | null;
  };

  // Solo terapeutas
  therapist: null | {
    displayName: string;
    slug: string;
    city: string | null;
    subscriptionStatus: string | null;
    subscriptionPlan: string | null;
    trialEndsAt: string | null;
    periodEnd: string | null;
    isPublished: boolean;
    verificationStatus: string;
    verifiedAt: string | null;
    calendarConnected: boolean;
    calendarFreebusyOk: boolean | null;
    stripeConnectEnabled: boolean;
    profileChecklist: { label: string; ok: boolean }[];
    availabilitySlots: number;
    documentsUploaded: string[];
    distinctPatients: number;
    returningPatients: number;
    income: number; // pagado con tarjeta, citas realizadas
    cashIncome: number; // acordado en efectivo, citas realizadas
    commissionToLemy: number;
    cancelledCount: number;
    noShowCount: number;
    reviewsCount: number;
    avgRating: number | null;
  };

  // Solo pacientes (o cualquiera que haya agendado como paciente)
  patient: null | {
    therapistsSeen: { name: string; count: number }[];
    cancelledCount: number;
    noShowCount: number;
    reviewsWritten: number;
  };

  communications: {
    byChannel: { channel: string; count: number }[];
    totalEmails: number;
    recentEmails: { subject: string; type: string; sentAt: string }[];
  };
};

export async function getUserDetail(id: string, auth: AdminAuthInfo | null): Promise<UserDetail | null> {
  const s = createServiceClient();
  const now = Date.now();

  const { data: p } = await s
    .from("profiles")
    .select("id, role, full_name, phone, created_at, deactivated_at, account_closed_at, push_enabled, email_whatsapp_enabled")
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;

  const role = String(p.role);

  const [
    { data: th },
    { data: apptsAsTherapist },
    { data: apptsAsPatient },
    { data: notifRows },
    { data: emailRows, count: emailCount },
  ] = await Promise.all([
    s
      .from("therapists")
      .select(
        "display_name, slug, city, subscription_status, subscription_plan, trial_ends_at, subscription_current_period_end, is_published, verification_status, verified_at, google_calendar_connected, google_calendar_freebusy_ok, stripe_connect_charges_enabled, photo_url, bio, tagline, price_min, price_max"
      )
      .eq("id", id)
      .maybeSingle(),
    s
      .from("appointments")
      .select("patient_id, status, payment_status, price, application_fee_cents, modality, scheduled_at")
      .eq("therapist_id", id)
      .limit(5000),
    s
      .from("appointments")
      .select("therapist_id, status, payment_status, price, modality, scheduled_at")
      .eq("patient_id", id)
      .limit(5000),
    s.from("notification_log").select("channel").eq("recipient_id", id).limit(20000),
    s
      .from("email_log")
      .select("subject, notification_type, sent_at", { count: "exact" })
      .eq("recipient_id", id)
      .order("sent_at", { ascending: false })
      .limit(5),
  ]);

  const isTherapist = Boolean(th);
  const tAppts = (apptsAsTherapist ?? []) as Row[];
  const pAppts = (apptsAsPatient ?? []) as Row[];
  // Citas "de esta persona" según el rol que tenga cuenta.
  const mine = isTherapist ? tAppts : pAppts;

  const byStatusMap = new Map<string, number>();
  for (const a of mine) byStatusMap.set(String(a.status), (byStatusMap.get(String(a.status)) ?? 0) + 1);
  const isHeld = (a: Row) =>
    (a.status === "confirmed" || a.status === "completed") && ms(a.scheduled_at) <= now;
  const times = mine.map((a) => ms(a.scheduled_at)).filter((t) => !Number.isNaN(t));
  const futureConfirmed = mine
    .filter((a) => a.status === "confirmed" && ms(a.scheduled_at) > now)
    .map((a) => ms(a.scheduled_at))
    .sort((x, y) => x - y);
  const iso = (t: number | undefined) => (t === undefined || !Number.isFinite(t) ? null : new Date(t).toISOString());

  // ── Terapeuta ──
  let therapist: UserDetail["therapist"] = null;
  if (th) {
    const [{ data: slots }, { data: creds }, { data: revs }] = await Promise.all([
      s.from("availability_slots").select("id", { count: "exact", head: false }).eq("therapist_id", id).limit(1000),
      s.from("therapist_credentials").select("tipo, documento_url").eq("therapist_id", id),
      s.from("reviews").select("rating").eq("therapist_id", id).limit(5000),
    ]);

    const heldAppts = tAppts.filter(isHeld);
    const perPatient = new Map<string, number>();
    for (const a of heldAppts) perPatient.set(String(a.patient_id), (perPatient.get(String(a.patient_id)) ?? 0) + 1);
    const allPatients = new Set(tAppts.map((a) => String(a.patient_id)));

    const ratings = (revs ?? []).map((r) => num((r as Row).rating));
    therapist = {
      displayName: String(th.display_name ?? ""),
      slug: String(th.slug ?? ""),
      city: (th.city as string | null) ?? null,
      subscriptionStatus: (th.subscription_status as string | null) ?? null,
      subscriptionPlan: (th.subscription_plan as string | null) ?? null,
      trialEndsAt: (th.trial_ends_at as string | null) ?? null,
      periodEnd: (th.subscription_current_period_end as string | null) ?? null,
      isPublished: Boolean(th.is_published),
      verificationStatus: String(th.verification_status ?? "pending"),
      verifiedAt: (th.verified_at as string | null) ?? null,
      calendarConnected: Boolean(th.google_calendar_connected),
      calendarFreebusyOk: (th.google_calendar_freebusy_ok as boolean | null) ?? null,
      stripeConnectEnabled: Boolean(th.stripe_connect_charges_enabled),
      profileChecklist: [
        { label: "Foto", ok: Boolean(th.photo_url) },
        { label: "Frase corta", ok: Boolean(th.tagline) },
        { label: "Biografía", ok: Boolean(th.bio) },
        { label: "Precio", ok: th.price_min != null },
        { label: "Horarios", ok: (slots?.length ?? 0) > 0 },
      ],
      availabilitySlots: slots?.length ?? 0,
      documentsUploaded: (creds ?? [])
        .filter((c) => Boolean((c as Row).documento_url))
        .map((c) => String((c as Row).tipo)),
      distinctPatients: allPatients.size,
      returningPatients: [...perPatient.values()].filter((n) => n >= 2).length,
      income: heldAppts.filter((a) => a.payment_status === "paid").reduce((t, a) => t + num(a.price), 0),
      cashIncome: heldAppts.filter((a) => a.payment_status === "efectivo").reduce((t, a) => t + num(a.price), 0),
      commissionToLemy: heldAppts
        .filter((a) => a.payment_status === "paid")
        .reduce((t, a) => t + num(a.application_fee_cents) / 100, 0),
      cancelledCount: tAppts.filter((a) => a.status === "cancelled").length,
      noShowCount: tAppts.filter((a) => a.status === "no_show").length,
      reviewsCount: ratings.length,
      avgRating: ratings.length ? ratings.reduce((x, y) => x + y, 0) / ratings.length : null,
    };
  }

  // ── Paciente ──
  let patient: UserDetail["patient"] = null;
  if (pAppts.length > 0 || role === "patient") {
    const therapistIds = [...new Set(pAppts.map((a) => String(a.therapist_id)))];
    const [{ data: names }, { data: written }] = await Promise.all([
      therapistIds.length
        ? s.from("therapists").select("id, display_name").in("id", therapistIds)
        : Promise.resolve({ data: [] as Row[] }),
      s.from("reviews").select("id").eq("patient_id", id).limit(5000),
    ]);
    const nameById = new Map((names ?? []).map((n) => [String((n as Row).id), String((n as Row).display_name)]));
    const countByTherapist = new Map<string, number>();
    for (const a of pAppts.filter(isHeld)) {
      countByTherapist.set(String(a.therapist_id), (countByTherapist.get(String(a.therapist_id)) ?? 0) + 1);
    }
    patient = {
      therapistsSeen: therapistIds.map((tid) => ({
        name: nameById.get(tid) ?? "—",
        count: countByTherapist.get(tid) ?? 0,
      })),
      cancelledCount: pAppts.filter((a) => a.status === "cancelled").length,
      noShowCount: pAppts.filter((a) => a.status === "no_show").length,
      reviewsWritten: written?.length ?? 0,
    };
  }

  // ── Comunicaciones ──
  const channelMap = new Map<string, number>();
  for (const r of notifRows ?? []) {
    const ch = String((r as Row).channel);
    channelMap.set(ch, (channelMap.get(ch) ?? 0) + 1);
  }

  const providers = auth?.providers ?? [];
  const loginMethod = providers.includes("google")
    ? providers.includes("email")
      ? "Google y correo/contraseña"
      : "Google"
    : providers.length
      ? "Correo y contraseña"
      : "—";

  return {
    id,
    role,
    fullName: (p.full_name as string | null) ?? null,
    email: auth?.email ?? "",
    loginMethod,
    phone: (p.phone as string | null) ?? null,
    createdAt: (p.created_at as string | null) ?? auth?.created_at ?? null,
    lastSignInAt: auth?.last_sign_in_at ?? null,
    deactivatedAt: (p.deactivated_at as string | null) ?? null,
    accountClosedAt: (p.account_closed_at as string | null) ?? null,
    pushEnabled: (p.push_enabled as boolean | null) ?? null,
    emailWhatsappEnabled: (p.email_whatsapp_enabled as boolean | null) ?? null,

    appointments: {
      total: mine.length,
      byStatus: [...byStatusMap.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
      held: mine.filter(isHeld).length,
      upcoming: futureConfirmed.length,
      online: mine.filter((a) => a.modality === "online").length,
      inPerson: mine.filter((a) => a.modality === "presencial").length,
      firstAt: iso(times.length ? Math.min(...times) : undefined),
      lastAt: iso(
        mine.filter(isHeld).length ? Math.max(...mine.filter(isHeld).map((a) => ms(a.scheduled_at))) : undefined
      ),
      nextAt: iso(futureConfirmed[0]),
    },

    therapist,
    patient,

    communications: {
      byChannel: [...channelMap.entries()].map(([channel, count]) => ({ channel, count })),
      totalEmails: emailCount ?? 0,
      recentEmails: (emailRows ?? []).map((e) => ({
        subject: String((e as Row).subject),
        type: String((e as Row).notification_type),
        sentAt: String((e as Row).sent_at),
      })),
    },
  };
}

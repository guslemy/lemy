"use client";

import { useEffect, useState } from "react";

// Antes se mostraban TODOS los horarios de las próximas 2 semanas de un
// jalón — abrumador para alguien que llega con poca energía. Ahora se elige
// primero la fecha (una fila de días), y solo entonces aparecen los
// horarios de ese día. Menos que procesar de un vistazo.
//
// Un solo click en un horario ya NO manda la solicitud — antes eso hacía
// fácil que alguien curioseando la agenda, sin intención real de agendar,
// generara una solicitud de la nada. Ahora el click solo abre un popup de
// confirmación con los datos de la cita (fecha, modalidad, método de pago);
// la solicitud de verdad solo se manda si la persona le da "Continuar" ahí.
//
// Servicios con precio propio (migración 0031, 2026-08-14): si el terapeuta
// configuró su catálogo, el paciente elige PRIMERO qué servicio quiere —
// eso define la duración (30/45/60 min) y con eso se sabe qué lista de
// horarios mostrar (daysByDuration ya viene calculada por duración desde el
// servidor, ver [slug]/page.tsx — evita tener que ir y volver al servidor
// cada vez que cambian de servicio, ya que solo hay 3 duraciones posibles).
// Si el terapeuta NO tiene catálogo configurado todavía, se salta ese paso y
// se usa el flujo de siempre (legacyDurationMin / priceLabel genérico).

export type DaySlots = {
  date: string; // YYYY-MM-DD
  label: string; // ej. "lun 20/7"
  slots: { startTime: string; scheduledAtUtc: string }[];
};

export type BookingService = {
  id: string;
  nombre: string;
  price: number;
  durationMin: number;
};

type Modality = "online" | "presencial";
type PaymentMethod = "card" | "cash";

export function BookingCalendar({
  daysByDuration,
  legacyDurationMin,
  services,
  therapistSlug,
  therapistName,
  priceLabel,
  onlineAvailable,
  inPersonAvailable,
  cardAvailable,
  cashAvailable,
  requestAppointment,
}: {
  daysByDuration: Record<number, DaySlots[]>;
  legacyDurationMin: number;
  services: BookingService[];
  therapistSlug: string;
  therapistName: string;
  priceLabel: string;
  onlineAvailable: boolean;
  inPersonAvailable: boolean;
  cardAvailable: boolean;
  cashAvailable: boolean;
  requestAppointment: (formData: FormData) => void;
}) {
  const hasServices = services.length > 0;
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    hasServices ? null : "legacy"
  );
  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;
  const activeDurationMin = selectedService?.durationMin ?? legacyDurationMin;
  const days = hasServices
    ? selectedService
      ? (daysByDuration[activeDurationMin] ?? [])
      : []
    : (daysByDuration[legacyDurationMin] ?? []);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modality, setModality] = useState<Modality>(onlineAvailable ? "online" : "presencial");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    cardAvailable ? "card" : "cash"
  );
  // El horario que se está por confirmar en el popup — null = popup cerrado.
  const [pendingSlot, setPendingSlot] = useState<{ startTime: string; scheduledAtUtc: string } | null>(
    null
  );
  // Sin estado "pending" nativo en el submit — sin esto, un doble click (o
  // un click mientras la red va lenta) manda dos solicitudes de golpe, ya
  // que el botón no tiene ninguna señal de que la primera ya se está
  // procesando.
  const [submitting, setSubmitting] = useState(false);

  // Cambiar de servicio resetea la fecha elegida — los horarios disponibles
  // dependen de la duración, así que la selección anterior puede ya no
  // aplicar (o el día ni siquiera tener horarios de esa duración).
  // Ajustado durante el render (patrón recomendado por React para "resetear
  // estado cuando cambia una prop", ver
  // https://react.dev/learn/you-might-not-need-an-effect) en vez de un
  // useEffect — evita el parpadeo de un frame con la fecha vieja antes de
  // que el efecto alcance a correr, y ya no dispara
  // react-hooks/set-state-in-effect.
  const [prevServiceId, setPrevServiceId] = useState(selectedServiceId);
  if (selectedServiceId !== prevServiceId) {
    setPrevServiceId(selectedServiceId);
    setSelectedDate(days[0]?.date ?? null);
  }

  // Si la reserva falla (horario ocupado, error, etc.), requestAppointment
  // redirige de vuelta a esta misma ruta (/[slug], solo cambian los query
  // params) — Next.js reutiliza esta instancia del componente en vez de
  // desmontarla, así que submitting/pendingSlot se quedaban en true/abierto
  // para siempre. daysByDuration llega recalculado del servidor en cada
  // navegación (nueva referencia aunque el contenido sea igual), así que
  // sirve como señal de "ya se resolvió la navegación, lo que sea que haya
  // pasado" para resetear el estado. En el caso de éxito no importa: la
  // página se va a otra ruta y este componente se desmonta por completo.
  // Mismo patrón que arriba: ajuste durante el render, no en un efecto.
  const [prevDaysByDuration, setPrevDaysByDuration] = useState(daysByDuration);
  if (daysByDuration !== prevDaysByDuration) {
    setPrevDaysByDuration(daysByDuration);
    setSubmitting(false);
    setPendingSlot(null);
  }

  // El caso que el useEffect de arriba NO cubre: pago con tarjeta. Ahí
  // requestAppointment no redirige dentro de Lemy — manda al paciente a
  // Stripe Checkout (dominio externo), así que la página de Lemy nunca
  // vuelve a cargar en el servidor. Si el paciente cancela el pago o le da
  // "atrás" en el navegador, Chrome/Safari suelen restaurar la página desde
  // su caché de navegación (bfcache) tal como quedó en memoria — con
  // submitting/pendingSlot todavía en true, sin volver a ejecutar ningún
  // useEffect de montaje. El evento "pageshow" con persisted=true es la
  // única señal del navegador para detectar justo ese caso y limpiar el
  // estado atorado.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setSubmitting(false);
        setPendingSlot(null);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  const modalityOption = (value: Modality, label: string, available: boolean) => (
    <label
      className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[0.82rem] transition-all duration-200 ${
        !available
          ? "cursor-not-allowed border-line bg-sage-white text-[#B7C0BA]"
          : modality === value
            ? "cursor-pointer border-forest bg-forest text-sage-white"
            : "cursor-pointer border-line bg-sage-white text-forest hover:border-forest"
      }`}
    >
      <input
        type="radio"
        name="modality_choice"
        value={value}
        checked={modality === value}
        disabled={!available}
        onChange={() => setModality(value)}
        className="sr-only"
      />
      {label}
    </label>
  );

  const paymentOption = (value: PaymentMethod, label: string) => (
    <label
      className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[0.82rem] transition-all duration-200 cursor-pointer ${
        paymentMethod === value
          ? "border-forest bg-forest text-sage-white"
          : "border-line bg-sage-white text-forest hover:border-forest"
      }`}
    >
      <input
        type="radio"
        name="payment_method_choice"
        value={value}
        checked={paymentMethod === value}
        onChange={() => setPaymentMethod(value)}
        className="sr-only"
      />
      {label}
    </label>
  );

  const confirmPriceLabel = selectedService
    ? `$${Math.round(selectedService.price)} MXN`
    : priceLabel;

  return (
    <div>
      {hasServices && (
        <div className="mb-6">
          <p className="mb-3 text-[0.88rem] text-[#42504A]">Primero elige el servicio:</p>
          <div className="flex flex-wrap gap-2.5">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedServiceId(s.id)}
                className={`rounded-full border px-4 py-2 font-mono text-[0.82rem] transition-all duration-200 active:scale-95 ${
                  selectedServiceId === s.id
                    ? "border-forest bg-forest text-sage-white"
                    : "border-line bg-sage-white text-forest hover:border-forest"
                }`}
              >
                {s.nombre} · ${Math.round(s.price)} MXN · {s.durationMin} min
              </button>
            ))}
          </div>
        </div>
      )}

      {(!hasServices || selectedService) && (
        <>
          <p className="mb-3 text-[0.88rem] text-[#42504A]">¿Cómo prefieres tu sesión?</p>
          <div className="mb-6 flex flex-wrap gap-2.5">
            {modalityOption("online", "En línea", onlineAvailable)}
            {modalityOption("presencial", "Presencial", inPersonAvailable)}
          </div>

          {days.length === 0 ? (
            <p className="text-[0.9rem] text-[#8B978F]">
              No hay horarios disponibles para esta duración por ahora.
            </p>
          ) : (
            <DayPicker
              days={days}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPickSlot={setPendingSlot}
            />
          )}
        </>
      )}

      {pendingSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-deep/40 px-4"
          onClick={() => !submitting && setPendingSlot(null)}
        >
          <div
            className="signature-corner w-full max-w-[420px] rounded-[24px] border border-line bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-rose-deep">
              Confirma tu solicitud
            </p>
            <h3 className="mt-2 font-display text-[1.15rem] text-forest">
              {selectedDay?.label} · {pendingSlot.startTime}
            </h3>

            <div className="mt-4 space-y-1.5 text-[0.88rem] text-[#3E4B44]">
              <p>
                <span className="font-medium">Con:</span> {therapistName}
              </p>
              {selectedService && (
                <p>
                  <span className="font-medium">Servicio:</span> {selectedService.nombre}
                </p>
              )}
              <p>
                <span className="font-medium">Modalidad:</span>{" "}
                {modality === "online" ? "En línea" : "Presencial"}
              </p>
              <p>
                <span className="font-medium">Tarifa:</span> {confirmPriceLabel}
              </p>
            </div>

            {cardAvailable && cashAvailable && (
              <div className="mt-4">
                <p className="mb-2 text-[0.85rem] text-[#42504A]">¿Cómo prefieres pagar?</p>
                <div className="flex flex-wrap gap-2.5">
                  {paymentOption("card", "Con tarjeta")}
                  {paymentOption("cash", "En efectivo")}
                </div>
              </div>
            )}
            {!cardAvailable && (
              <p className="mt-4 text-[0.8rem] text-[#7C877F]">
                El pago se acuerda directamente con {therapistName.split(" ")[0]} (por ejemplo, en
                efectivo).
              </p>
            )}
            {cardAvailable && !cashAvailable && (
              <p className="mt-4 text-[0.8rem] text-[#7C877F]">
                Esta sesión se paga con tarjeta al confirmar tu solicitud.
              </p>
            )}

            <form
              action={requestAppointment}
              onSubmit={() => setSubmitting(true)}
              className="mt-5 flex items-center gap-3"
            >
              <input type="hidden" name="therapist_slug" value={therapistSlug} />
              <input type="hidden" name="scheduled_at" value={pendingSlot.scheduledAtUtc} />
              <input type="hidden" name="modality" value={modality} />
              <input
                type="hidden"
                name="therapist_service_id"
                value={selectedService ? selectedService.id : ""}
              />
              <input
                type="hidden"
                name="payment_method"
                value={cardAvailable && cashAvailable ? paymentMethod : cardAvailable ? "card" : "cash"}
              />
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-forest px-4 py-2 font-mono text-[0.82rem] text-sage-white transition-all duration-200 hover:bg-forest-deep disabled:pointer-events-none disabled:opacity-60"
              >
                {submitting ? "Enviando…" : "Continuar"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setPendingSlot(null)}
                className="rounded-full border border-line px-4 py-2 font-mono text-[0.82rem] text-[#8B978F] hover:border-forest hover:text-forest disabled:pointer-events-none disabled:opacity-60"
              >
                Volver
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Selector de día + horarios (rediseño 2026-10-15)
//
// Antes: una "pared" de píldoras, una por cada día disponible (unas 12
// semanas seguidas), sin ninguna estructura. Ahora: un calendario mensual
// (semana empezando en lunes) donde solo los días con horario se pueden
// tocar, y a su lado los horarios del día elegido, agrupados en mañana /
// tarde / noche. En el celular se apilan.
// ─────────────────────────────────────────────────────────────────────────

const WEEKDAY_HEADERS = ["L", "M", "M", "J", "V", "S", "D"];

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function monthTitle(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return capitalize(
    new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(y, m - 1, 1))
    )
  );
}

function longDayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return capitalize(
    new Intl.DateTimeFormat("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, d)))
  );
}

function ChevronMonth({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

function DayPicker({
  days,
  selectedDate,
  onSelectDate,
  onPickSlot,
}: {
  days: DaySlots[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPickSlot: (slot: { startTime: string; scheduledAtUtc: string }) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState<string | null>(null);

  const dayByDate = new Map(days.map((d) => [d.date, d]));
  const months = [...new Set(days.map((d) => d.date.slice(0, 7)))];
  // El mes que se ve: el que eligió con las flechas, si sigue existiendo en la
  // lista actual (al cambiar de servicio la lista puede cambiar); si no, el
  // del día seleccionado, o el primero con horarios.
  const monthKey =
    visibleMonth && months.includes(visibleMonth)
      ? visibleMonth
      : (selectedDate?.slice(0, 7) ?? months[0]);
  const monthIdx = months.indexOf(monthKey);

  const [y, m] = monthKey.split("-").map(Number);
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedDay = selectedDate ? (dayByDate.get(selectedDate) ?? null) : null;
  const groups = selectedDay
    ? [
        { label: "Mañana", slots: selectedDay.slots.filter((s) => Number(s.startTime.slice(0, 2)) < 12) },
        {
          label: "Tarde",
          slots: selectedDay.slots.filter((s) => {
            const h = Number(s.startTime.slice(0, 2));
            return h >= 12 && h < 18;
          }),
        },
        { label: "Noche", slots: selectedDay.slots.filter((s) => Number(s.startTime.slice(0, 2)) >= 18) },
      ].filter((g) => g.slots.length > 0)
    : [];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,340px)_1fr] md:gap-8">
      <div>
        <p className="mb-3 text-[0.88rem] text-[#42504A]">Elige el día:</p>
        <div className="rounded-2xl border border-line bg-sage-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={monthIdx <= 0}
              onClick={() => setVisibleMonth(months[monthIdx - 1])}
              className="flex h-8 w-8 items-center justify-center rounded-full text-forest transition-colors hover:bg-forest/[0.08] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronMonth direction="left" />
            </button>
            <p className="font-display text-[1.02rem] text-forest">{monthTitle(monthKey)}</p>
            <button
              type="button"
              aria-label="Mes siguiente"
              disabled={monthIdx >= months.length - 1}
              onClick={() => setVisibleMonth(months[monthIdx + 1])}
              className="flex h-8 w-8 items-center justify-center rounded-full text-forest transition-colors hover:bg-forest/[0.08] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronMonth direction="right" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_HEADERS.map((w, i) => (
              <span key={i} className="pb-1 font-mono text-[0.68rem] uppercase text-[#8B978F]">
                {w}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={`b${i}`} />;
              const date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const available = dayByDate.has(date);
              const isSelected = selectedDate === date;
              if (!available) {
                return (
                  <span
                    key={date}
                    className="flex aspect-square items-center justify-center text-[0.85rem] text-[#C5CDC8]"
                  >
                    {day}
                  </span>
                );
              }
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelectDate(date)}
                  aria-pressed={isSelected}
                  className={`flex aspect-square items-center justify-center rounded-full text-[0.85rem] font-medium transition-all duration-200 active:scale-95 ${
                    isSelected
                      ? "bg-forest text-sage-white shadow-[0_6px_14px_-6px_rgba(33,56,43,0.6)]"
                      : "bg-forest/[0.08] text-forest hover:bg-forest hover:text-sage-white"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        {selectedDay ? (
          <div key={selectedDay.date} className="animate-step-in">
            <p className="mb-1 font-display text-[1.1rem] text-forest">{longDayLabel(selectedDay.date)}</p>
            <p className="mb-4 text-[0.82rem] text-[#7C877F]">Elige la hora de inicio:</p>
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-rose-deep">
                    {g.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {g.slots.map((slot) => (
                      <button
                        key={slot.scheduledAtUtc}
                        type="button"
                        onClick={() => onPickSlot(slot)}
                        className="rounded-full border border-line bg-sage-white px-3 py-2 font-mono text-[0.82rem] text-forest transition-all duration-200 active:scale-95 hover:border-forest hover:bg-forest hover:text-sage-white"
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-line px-6 text-center text-[0.88rem] text-[#8B978F]">
            Elige un día en el calendario para ver los horarios disponibles.
          </div>
        )}
      </div>
    </div>
  );
}

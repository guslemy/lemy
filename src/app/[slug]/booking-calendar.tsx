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
  useEffect(() => {
    setSelectedDate(days[0]?.date ?? null);
  }, [selectedServiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si la reserva falla (horario ocupado, error, etc.), requestAppointment
  // redirige de vuelta a esta misma ruta (/[slug], solo cambian los query
  // params) — Next.js reutiliza esta instancia del componente en vez de
  // desmontarla, así que submitting/pendingSlot se quedaban en true/abierto
  // para siempre. daysByDuration llega recalculado del servidor en cada
  // navegación (nueva referencia aunque el contenido sea igual), así que
  // sirve como señal de "ya se resolvió la navegación, lo que sea que haya
  // pasado" para resetear el estado. En el caso de éxito no importa: la
  // página se va a otra ruta y este componente se desmonta por completo.
  useEffect(() => {
    setSubmitting(false);
    setPendingSlot(null);
  }, [daysByDuration]);

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
            <>
              <p className="mb-3 text-[0.88rem] text-[#42504A]">Primero elige el día:</p>
              <div className="flex flex-wrap gap-2.5">
                {days.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelectedDate(d.date)}
                    className={`rounded-full border px-4 py-2 font-mono text-[0.82rem] transition-all duration-200 active:scale-95 ${
                      selectedDate === d.date
                        ? "border-forest bg-forest text-sage-white"
                        : "border-line bg-sage-white text-forest hover:border-forest"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedDay && (
            <div key={selectedDay.date} className="animate-step-in mt-6">
              <p className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-[#5A665F]">
                Horarios para el {selectedDay.label}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {selectedDay.slots.map((slot) => (
                  <button
                    key={slot.scheduledAtUtc}
                    type="button"
                    onClick={() => setPendingSlot(slot)}
                    className="rounded-full border border-line bg-sage-white px-4 py-2 font-mono text-[0.82rem] text-forest transition-all duration-200 active:scale-95 hover:border-forest hover:bg-forest hover:text-sage-white"
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            </div>
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

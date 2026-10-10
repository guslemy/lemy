import Link from "next/link";

// Aviso dentro del producto (requisito de la verificación de Google: debe
// verse de forma destacada, junto al punto donde se pide el permiso de
// Calendar). Debe coincidir con lo que dice la sección "Información de
// Google" del Aviso de Privacidad (/privacidad#google) — si se cambia uno,
// cambiar el otro.
export function GoogleCalendarDisclosure({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[0.78rem] leading-relaxed text-[#5A665F] ${className}`}>
      Lemy usa tu Google Calendar solo para (1) saber en qué horarios ya estás ocupado, sin ver
      títulos ni detalles de tus eventos, y (2) crear, mover o cancelar las citas que se agendan
      en Lemy. No leemos el resto de tus eventos ni compartimos esta información con nadie. Puedes
      revocar el acceso cuando quieras. Más detalles en el{" "}
      <Link href="/privacidad#google" className="underline">
        Aviso de Privacidad
      </Link>
      .
    </p>
  );
}

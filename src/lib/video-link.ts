// Link de videollamada de respaldo para cuando el terapeuta no tiene Google
// Calendar conectado (o Google falló al crear el evento): sala única por
// cita en Jitsi Meet — gratis, sin cuenta de ningún lado, sin llave de API,
// misma experiencia sin importar el correo con el que entró a Lemy.
export function fallbackMeetingLink(appointmentId: string): string {
  const room = `lemy-${appointmentId.replace(/-/g, "")}`;
  return `https://meet.jit.si/${room}`;
}

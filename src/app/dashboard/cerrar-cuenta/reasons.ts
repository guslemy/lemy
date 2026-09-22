// Separado de actions.ts porque un archivo "use server" solo puede exportar
// funciones async — estas listas las usa tanto la UI (dropdown) como la
// Server Action (validación del valor recibido).
export const THERAPIST_REASONS = [
  "Ya no estoy ejerciendo / me retiro de la práctica",
  "Uso otra plataforma o herramienta",
  "El costo de la suscripción no se ajusta a mi práctica",
  "Problemas técnicos con la plataforma",
  "Otro",
];

export const PATIENT_REASONS = [
  "Ya no necesito terapia / concluí mi proceso",
  "Encontré terapeuta fuera de Lemy",
  "El costo no se ajusta a mi presupuesto",
  "No encontré un(a) terapeuta que me convenciera",
  "Problemas técnicos con la plataforma",
  "Otro",
];

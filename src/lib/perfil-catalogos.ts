// Catálogos fijos del formulario de perfil de terapeuta — a diferencia de
// specialties/therapeutic_approaches (que sí viven en tablas propias porque
// crecen con el tiempo y llevan nombre_coloquial/descripcion_coloquial),
// estas son listas cerradas tomadas directo de la propuesta de Notion
// "Sugerencias para perfil del terapeuta". No necesitan tabla ni admin: si
// algún día cambian, se edita este archivo.

export const GENEROS = ["Mujer", "Hombre", "No binario", "Prefiero no especificarlo"] as const;

export const PROFESIONES = [
  "Psicólogo(a)",
  "Psicólogo(a) Clínico(a)",
  "Psiquiatra",
  "Psicoterapeuta",
  "Otro",
] as const;

// "Población que atiende" en el Notion — reusa la columna client_niches, que
// antes era texto libre sin estructura.
export const POBLACION_ATENDIDA = [
  "Primera infancia (0–5 años)",
  "Niñas y niños (6–12 años)",
  "Adolescentes (13–17 años)",
  "Adultos jóvenes (18–29 años)",
  "Adultos (30–59 años)",
  "Personas mayores (60+)",
] as const;

export const TIPOS_DE_TERAPIA = ["Individual", "Pareja", "Familiar", "Grupal"] as const;

// Checkboxes fijos + un campo "Otro" de texto libre para lo que no esté en
// la lista (columna languages sigue siendo text[], sin cambio de esquema).
export const IDIOMAS_FIJOS = ["Español", "Inglés", "Francés", "Lengua de Señas Mexicana"] as const;

export const GRADOS_POSGRADO = [
  "Especialidad",
  "Maestría",
  "Doctorado",
  "Diplomado",
  "Certificación",
] as const;

export const TIPOS_FORMACION_CONTINUA = [
  "Curso",
  "Diplomado",
  "Certificación",
  "Taller",
  "Seminario",
  "Congreso",
  "Supervisión clínica",
] as const;

// Duraciones que un terapeuta puede asignarle a cada servicio de su
// catálogo (migración 0031). Limitado a 3 opciones a propósito — decisión
// de Gustavo tras platicarlo con el equipo de terapeutas, para no complicar
// la lógica de disponibilidad (src/lib/availability.ts) ni la UI.
export const DURACIONES_SERVICIO = [30, 45, 60] as const;

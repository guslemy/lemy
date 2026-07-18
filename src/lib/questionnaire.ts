// Cuestionario de match — lógica pura, sin dependencias de UI ni de red.
//
// Diseño deliberado: no guardamos ninguna respuesta del paciente (ni en la
// base de datos ni en analytics). Todo vive en memoria del navegador durante
// la sesión del cuestionario y se descarta al salir. Esto evita que las
// respuestas (que son datos sensibles de salud bajo la LFPDPPP en cuanto se
// ligan a un identificador) requieran un Aviso de Privacidad específico —
// como nunca se ligan a nadie, no aplica.
//
// El "match" es un puntaje suave (no un filtro estricto): mostramos siempre
// los mejores candidatos disponibles, nunca una pantalla vacía por ser
// demasiado exigentes con los criterios.

export type ParaQuien = "yo" | "adolescente" | "nino" | "familiar";
export type Modalidad = "presencial" | "online" | "cualquiera";
export type GeneroPreferido = "mujer" | "hombre" | "sin_preferencia";

export type QuizAnswers = {
  paraQuien: ParaQuien;
  modalidad: Modalidad;
  generoPreferido: GeneroPreferido;
  motivos: string[]; // slugs de specialties elegidos (puede incluir "otro")
  primeraVez: boolean;
};

export type MatchTherapist = {
  slug: string;
  display_name: string;
  tagline: string | null;
  city: string | null;
  price_min: number | null;
  price_max: number | null;
  is_online_available: boolean;
  gender: string | null;
  client_niches: string[] | null;
  photo_url: string | null;
  specialtySlugs: string[];
  specialtyNames: string[];
};

function scoreTherapist(t: MatchTherapist, answers: QuizAnswers): number {
  let score = 0;

  // Señal principal: motivo de consulta.
  const motivosElegidos = answers.motivos.filter((m) => m !== "otro");
  const coincidencias = t.specialtySlugs.filter((s) => motivosElegidos.includes(s)).length;
  score += coincidencias * 10;

  // Modalidad.
  if (answers.modalidad === "online" && t.is_online_available) score += 3;
  if (answers.modalidad === "cualquiera") score += 1;

  // Preferencia de género (si el terapeuta indicó el suyo).
  const genero = (t.gender ?? "").toLowerCase();
  if (answers.generoPreferido === "mujer" && genero.includes("mujer")) score += 2;
  if (answers.generoPreferido === "hombre" && genero.includes("hombre")) score += 2;

  // Para quién es la terapia, cruzado con a quién atiende el terapeuta.
  const niches = (t.client_niches ?? []).map((n) => n.toLowerCase());
  if (answers.paraQuien === "adolescente" && niches.some((n) => n.includes("adolescent"))) score += 2;
  if (answers.paraQuien === "nino" && niches.some((n) => n.includes("niñ") || n.includes("nin") || n.includes("infan"))) score += 2;
  if (
    (answers.paraQuien === "yo" || answers.paraQuien === "familiar") &&
    niches.some((n) => n.includes("adulto"))
  ) score += 1;

  return score;
}

// Siempre regresa hasta `limit` terapeutas, ordenados de mejor a peor match
// (nunca filtra a cero por ser demasiado estricto).
export function rankTherapists(
  therapists: MatchTherapist[],
  answers: QuizAnswers,
  limit = 3
): MatchTherapist[] {
  return [...therapists]
    .map((t) => ({ t, score: scoreTherapist(t, answers) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t);
}

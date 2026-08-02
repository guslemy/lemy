// Enriquecimiento estático de /enfoques — la descripción corta ya vive en
// Supabase (therapeutic_approaches.descripcion_coloquial) porque también se
// usa en el perfil público del terapeuta. Estos dos campos adicionales solo
// se usan en la página /enfoques, así que no justifican una migración: es
// contenido editorial, igual que blog-posts.ts.
export type ApproachDetail = {
  paraQuienEs: string;
  queEsperar: string;
};

export const APPROACH_DETAILS: Record<string, ApproachDetail> = {
  "cognitivo-conductual": {
    paraQuienEs:
      "Ideal si buscas herramientas concretas para manejar ansiedad, pensamientos repetitivos o hábitos que quieres cambiar, y te gusta ver avances medibles.",
    queEsperar:
      "Sesiones estructuradas, con ejercicios y tareas para practicar entre una sesión y otra. Se trabaja directamente sobre pensamientos y comportamientos específicos.",
  },
  psicodinamica: {
    paraQuienEs:
      "Ideal si sientes que repites patrones que no entiendes del todo, o quieres explorar el origen de lo que sientes, no solo manejarlo.",
    queEsperar:
      "Un proceso más largo y menos estructurado, donde se exploran experiencias pasadas y patrones a través de la conversación libre.",
  },
  sistemica: {
    paraQuienEs:
      "Ideal si lo que te trae a terapia tiene que ver directamente con tu familia, pareja o entorno cercano.",
    queEsperar:
      "El foco no eres solo tú, sino tus relaciones y cómo interactúan entre sí. A veces se invita a otros miembros de la familia o pareja a alguna sesión.",
  },
  humanista: {
    paraQuienEs:
      "Ideal si buscas un espacio cálido y sin juicios para conocerte y aceptarte mejor, sin necesariamente \"corregir\" algo puntual.",
    queEsperar:
      "Sesiones centradas en ti como persona, con acompañamiento cercano. Menos estructura, más escucha y validación de lo que vives.",
  },
  gestalt: {
    paraQuienEs:
      "Ideal si quieres conectar más con lo que sientes en el momento presente y entenderte a través de tus reacciones inmediatas.",
    queEsperar:
      "Se trabaja mucho con el \"aquí y ahora\" de la sesión misma — lo que sientes o notas en el momento, más que analizar el pasado a fondo.",
  },
  emdr: {
    paraQuienEs:
      "Ideal si tienes una experiencia difícil o traumática específica que sientes que sigue afectándote, más que un malestar general.",
    queEsperar:
      "Una técnica puntual (no un proceso general) que usa movimientos oculares u otros estímulos para ayudar a reprocesar recuerdos difíciles.",
  },
};

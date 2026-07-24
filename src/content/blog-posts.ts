// Contenido del blog, escrito como bloques estructurados (no markdown) para
// tener control total de la jerarquía de encabezados (bueno para SEO) sin
// depender de una librería de parseo adicional. 90% de los posts los
// redacta Gustavo (con ayuda de Claude); ocasionalmente un terapeuta firma
// uno — por eso authorName es un campo simple, no una relación a la tabla
// de terapeutas.

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "cta"; text: string; href: string; label: string };

export type BlogPost = {
  slug: string;
  title: string;
  metaDescription: string;
  excerpt: string;
  publishedAt: string;
  authorName: string;
  readingMinutes: number;
  blocks: BlogBlock[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "que-esperar-primera-sesion-terapia",
    title: "¿Qué esperar en tu primera sesión de terapia?",
    metaDescription:
      "Si nunca has ido a terapia, es normal sentir nervios. Te explicamos qué pasa en una primera sesión, qué te van a preguntar y cómo saber si hay buena conexión.",
    excerpt:
      "Es normal sentir nervios antes de tu primera sesión. Aquí te explicamos, paso a paso, qué puedes esperar.",
    publishedAt: "2026-07-24",
    authorName: "Equipo Lemy",
    readingMinutes: 5,
    blocks: [
      {
        type: "p",
        text: "Si nunca has ido a terapia, lo más probable es que la idea de la primera sesión te genere algo de ansiedad — ¿qué le voy a decir a un desconocido? ¿Qué tal que me juzga? ¿Qué tal que no sé ni por dónde empezar? Es una reacción completamente normal, y la buena noticia es que una primera sesión bien llevada está diseñada, precisamente, para quitarte esa presión de encima.",
      },
      {
        type: "h2",
        text: "Antes de la sesión: qué necesitas (y qué no)",
      },
      {
        type: "p",
        text: "No necesitas preparar un discurso ni tener clarísimo qué es lo que te pasa. Eso es, literalmente, para lo que está ahí tu terapeuta. Lo único que ayuda tener listo:",
      },
      {
        type: "ul",
        items: [
          "Una idea general de qué te trajo a buscar terapia — no hace falta que sea profunda o elaborada, basta con lo que ya sientes.",
          "Un espacio tranquilo y con privacidad, sobre todo si tu sesión es en línea.",
          "Si es en línea: buena conexión a internet y probar tu cámara/micrófono unos minutos antes.",
        ],
      },
      {
        type: "h2",
        text: "Qué pasa en los primeros minutos",
      },
      {
        type: "p",
        text: "La primera sesión —a veces llamada \"sesión de valoración\"— suele ser más una conversación que una entrevista formal. Tu terapeuta te va a preguntar qué te trae a consulta, un poco de tu historia y contexto, y qué te gustaría que fuera diferente. Tú decides cuánto compartir; no hay obligación de contarlo todo de una vez.",
      },
      {
        type: "h2",
        text: "Las preguntas más comunes que te van a hacer",
      },
      {
        type: "ul",
        items: [
          "¿Qué te motivó a buscar terapia en este momento de tu vida?",
          "¿Has ido a terapia antes? ¿Cómo fue esa experiencia?",
          "¿Cómo describirías lo que sientes últimamente?",
          "¿Qué te gustaría lograr o sentir diferente al paso del tiempo?",
        ],
      },
      {
        type: "h2",
        text: "Es normal no sentir \"clic\" de inmediato",
      },
      {
        type: "p",
        text: "La conexión con un terapeuta a veces se siente desde la primera sesión, y a veces toma dos o tres para saber si es la persona correcta. Ninguno de los dos casos significa que algo esté mal contigo o con el proceso — es información valiosa, no un fracaso.",
      },
      {
        type: "h2",
        text: "Cómo saber si es la persona correcta para ti",
      },
      {
        type: "p",
        text: "Más allá del enfoque o la especialidad, presta atención a cómo te sientes al hablar: ¿sentiste que te escuchó sin juzgarte? ¿Te dio espacio para pensar tus respuestas? ¿Terminaste la sesión sintiéndote un poco más ligero, aunque sea un poco? Esas señales suelen importar más que el título en la pared.",
      },
      {
        type: "cta",
        text: "¿Quieres que te ayudemos a encontrar a esa persona?",
        label: "Iniciar test de afinidad",
        href: "/encuentra",
      },
    ],
  },
  {
    slug: "como-elegir-terapeuta-preguntas-que-importan",
    title: "Cómo elegir terapeuta: las preguntas que sí importan",
    metaDescription:
      "Elegir terapeuta puede sentirse abrumador. Te compartimos las preguntas que de verdad ayudan a decidir, más allá del precio o la ubicación.",
    excerpt:
      "Elegir terapeuta es más que comparar precios. Estas son las preguntas que de verdad marcan la diferencia.",
    publishedAt: "2026-07-24",
    authorName: "Equipo Lemy",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "Buscar terapeuta puede sentirse como elegir a ciegas: hay perfiles con fotos profesionales, tarifas distintas, y palabras técnicas que no siempre dicen mucho si no eres del área. Antes de decidir por lo primero que aparece, vale la pena hacerte algunas preguntas — no al terapeuta todavía, sino a ti mismo.",
      },
      {
        type: "h2",
        text: "1. ¿Qué necesito trabajar, en mis propias palabras?",
      },
      {
        type: "p",
        text: "No necesitas un diagnóstico para empezar a buscar. Basta con algo como \"me cuesta dormir por la ansiedad\" o \"quiero entender por qué repito los mismos patrones en mis relaciones\". Esa frase, con tus propias palabras, ya te dice mucho sobre qué especialidad buscar.",
      },
      {
        type: "h2",
        text: "2. ¿Prefiero terapia en línea o presencial?",
      },
      {
        type: "p",
        text: "No hay una respuesta correcta — depende de tu rutina, tu comodidad, y si te ayuda o te distrae estar en tu propio espacio durante la sesión. Muchos terapeutas ofrecen ambas modalidades, así que no tienes que decidirlo de forma permanente.",
      },
      {
        type: "h2",
        text: "3. ¿Me importa el enfoque terapéutico, o prefiero que me lo expliquen?",
      },
      {
        type: "p",
        text: "Términos como Cognitivo-conductual, Humanista o Gestalt describen la escuela de pensamiento detrás de cómo trabaja un terapeuta. No necesitas ser experto para elegir — puedes filtrar por el motivo de consulta y dejar que el enfoque sea parte de la conversación en tu primera sesión.",
      },
      {
        type: "h2",
        text: "4. ¿Qué preguntas le haría yo a un terapeuta antes de agendar?",
      },
      {
        type: "ul",
        items: [
          "¿Tienes experiencia trabajando con lo que yo estoy pasando?",
          "¿Cómo son tus sesiones — más estructuradas o más de conversación libre?",
          "¿Qué pasa si después de un par de sesiones siento que no es lo que busco?",
          "¿Cuál es tu disponibilidad real para agendar seguido?",
        ],
      },
      {
        type: "h2",
        text: "5. ¿Estoy comparando por precio, o por si de verdad me hace sentido?",
      },
      {
        type: "p",
        text: "El precio importa, sin duda — pero el terapeuta más caro no es necesariamente el mejor para ti, y el más económico no es un compromiso menor. Vale más encontrar a alguien con quien sientas que puedes ser honesto, que ahorrarte unos pesos con alguien con quien no conectas.",
      },
      {
        type: "cta",
        text: "Responde 5 preguntas breves y anónimas, y te acercamos a quienes tendrían mayor afinidad contigo.",
        label: "Iniciar test de afinidad",
        href: "/encuentra",
      },
    ],
  },
  {
    slug: "terapia-en-linea-vs-presencial",
    title: "Terapia en línea vs. presencial: ¿cuál me conviene?",
    metaDescription:
      "¿Terapia en línea o presencial? Comparamos ventajas reales de cada modalidad para ayudarte a decidir cuál te conviene más, sin que sea una decisión permanente.",
    excerpt:
      "Ninguna modalidad es mejor en absoluto — depende de ti. Aquí comparamos ambas para que decidas con más claridad.",
    publishedAt: "2026-07-24",
    authorName: "Equipo Lemy",
    readingMinutes: 5,
    blocks: [
      {
        type: "p",
        text: "Una de las primeras decisiones al buscar terapia es la modalidad: ¿en línea o presencial? No hay una respuesta universal — depende de tu rutina, tu personalidad, y hasta de qué tan cómodo te sientas abriéndote en persona frente a alguien.",
      },
      {
        type: "h2",
        text: "Ventajas de la terapia en línea",
      },
      {
        type: "ul",
        items: [
          "Ahorras el tiempo y el costo de traslado — útil si tu semana ya está saturada.",
          "Puedes tener tu sesión desde un espacio donde te sientas seguro, como tu propia casa.",
          "Amplía tus opciones: no estás limitado a terapeutas cerca de ti.",
          "Facilita mantener la constancia cuando viajas o cambias de ciudad seguido.",
        ],
      },
      {
        type: "h2",
        text: "Ventajas de la terapia presencial",
      },
      {
        type: "ul",
        items: [
          "Para algunas personas, estar físicamente en un consultorio ayuda a separar el espacio de terapia del resto de su vida diaria.",
          "Elimina las distracciones que a veces trae estar en casa (notificaciones, tareas pendientes, otras personas cerca).",
          "Algunos procesos —sobre todo los que involucran trabajo corporal— se benefician de estar en persona.",
        ],
      },
      {
        type: "h2",
        text: "¿Y si no estoy seguro?",
      },
      {
        type: "p",
        text: "No tienes que decidirlo para siempre. Muchos terapeutas en Lemy ofrecen ambas modalidades, así que puedes empezar con la que te resulte más accesible y cambiar más adelante si sientes que la otra te serviría mejor. Lo que importa es que empieces, no que la primera decisión sea perfecta.",
      },
      {
        type: "h2",
        text: "Una pregunta más útil que \"¿cuál es mejor?\"",
      },
      {
        type: "p",
        text: "En vez de preguntarte cuál modalidad es objetivamente superior, pregúntate: ¿en cuál de las dos me sentiría con más apertura para hablar de lo que de verdad me pasa? Esa respuesta suele ser más honesta que cualquier lista de pros y contras.",
      },
      {
        type: "cta",
        text: "Filtra terapeutas por modalidad y encuentra la opción que más te acomode.",
        label: "Ver terapeutas verificados",
        href: "/buscar",
      },
    ],
  },
  {
    slug: "enfoques-de-terapia-explicados",
    title: "Enfoques de terapia explicados: ¿cuál es para mí?",
    metaDescription:
      "Cognitivo-conductual, Psicodinámico, Sistémico, Humanista, Gestalt, EMDR — qué significa cada enfoque de terapia y cómo saber cuál se ajusta más a ti.",
    excerpt:
      "Los nombres técnicos de los enfoques de terapia no tienen por qué sonar complicados. Aquí te los explicamos en lenguaje llano.",
    publishedAt: "2026-07-24",
    authorName: "Equipo Lemy",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "Cuando empiezas a buscar terapeuta, es común toparte con palabras como \"Cognitivo-conductual\" o \"Psicodinámico\" y no tener idea de qué significan en la práctica. No necesitas ser experto para elegir bien — pero entender lo básico de cada enfoque sí te puede ayudar a tener una primera conversación más informada.",
      },
      {
        type: "h2",
        text: "Cognitivo-conductual (TCC)",
      },
      {
        type: "p",
        text: "Se enfoca en identificar los pensamientos que te generan malestar y transformarlos en herramientas prácticas para el día a día. Suele ser un proceso más estructurado, con ejercicios concretos entre sesión y sesión.",
      },
      {
        type: "h2",
        text: "Psicodinámico",
      },
      {
        type: "p",
        text: "Explora tu historia y patrones desde el pasado para entender el porqué de tus comportamientos actuales. Es un proceso que suele tomar más tiempo, pero que profundiza en el origen de lo que sientes, no solo en manejarlo.",
      },
      {
        type: "h2",
        text: "Sistémico",
      },
      {
        type: "p",
        text: "Mira cómo tu familia, pareja o entorno influye en lo que vives — útil cuando lo que te trae a terapia tiene que ver directamente con tus relaciones más cercanas.",
      },
      {
        type: "h2",
        text: "Humanista",
      },
      {
        type: "p",
        text: "Centrado en ti como persona, sin juicios. Es un espacio de acompañamiento cálido pensado para que te conozcas y te aceptes mejor, más que para \"corregir\" algo puntual.",
      },
      {
        type: "h2",
        text: "Gestalt",
      },
      {
        type: "p",
        text: "Trabaja con lo que sientes en el aquí y ahora, en el momento presente de la sesión, para que te conozcas mejor a través de tus propias reacciones inmediatas.",
      },
      {
        type: "h2",
        text: "EMDR",
      },
      {
        type: "p",
        text: "Una técnica especializada diseñada para reprocesar experiencias difíciles o traumáticas específicas — no es un enfoque general, sino una herramienta puntual para ese tipo de procesos.",
      },
      {
        type: "h2",
        text: "¿Y si no sé cuál elegir?",
      },
      {
        type: "p",
        text: "No pasa nada. La mayoría de las personas no llegan sabiendo qué enfoque necesitan — llegan sabiendo qué sienten. Puedes dejar que eso guíe tu búsqueda y hablarlo directamente en tu primera sesión.",
      },
      {
        type: "cta",
        text: "Consulta la guía completa de enfoques, con la explicación de cada terapeuta verificado en Lemy.",
        label: "Ver todos los enfoques",
        href: "/enfoques",
      },
    ],
  },
  {
    slug: "senales-momento-buscar-ayuda-profesional",
    title: "Señales de que es momento de buscar ayuda profesional",
    metaDescription:
      "No hace falta esperar una crisis para ir a terapia. Estas son algunas señales, sin juicio ni alarma, de que podría ser un buen momento para buscar acompañamiento.",
    excerpt:
      "No hace falta tocar fondo para merecer acompañamiento. Estas son algunas señales, sin alarma ni juicio.",
    publishedAt: "2026-07-24",
    authorName: "Equipo Lemy",
    readingMinutes: 5,
    blocks: [
      {
        type: "p",
        text: "Una de las ideas que más frena a la gente de ir a terapia es pensar que hace falta estar \"muy mal\" para justificarlo. La realidad es distinta: la terapia no es solo para crisis, y buscar ayuda a tiempo suele ser más ligero que esperar a que las cosas se compliquen más.",
      },
      {
        type: "h2",
        text: "Sientes que algo te pesa más de lo normal, aunque no sepas nombrarlo",
      },
      {
        type: "p",
        text: "No necesitas tener claridad total sobre lo que te pasa para buscar ayuda. De hecho, ese \"no sé bien qué es, pero algo no está bien\" es una de las razones más comunes y válidas para empezar terapia.",
      },
      {
        type: "h2",
        text: "Notas que repites los mismos patrones sin poder salir de ellos",
      },
      {
        type: "p",
        text: "Ya sea en relaciones, en el trabajo, o en cómo te tratas a ti mismo — si sientes que das vueltas al mismo lugar sin importar qué intentes, un espacio externo y sin juicio puede ayudarte a ver el patrón desde otro ángulo.",
      },
      {
        type: "h2",
        text: "Tu círculo cercano te ha dicho que te ve diferente",
      },
      {
        type: "p",
        text: "A veces las personas que nos rodean notan cambios antes que nosotros mismos — más cansancio, más irritabilidad, más distancia. No es un diagnóstico, pero sí una señal que vale la pena tomar en serio.",
      },
      {
        type: "h2",
        text: "Sientes que ya no disfrutas cosas que antes sí",
      },
      {
        type: "p",
        text: "Cuando actividades, personas o rutinas que antes te daban energía ahora se sienten neutrales o pesadas, es una señal de que algo merece atención — no necesariamente algo grave, pero sí algo que se beneficiaría de acompañamiento.",
      },
      {
        type: "h2",
        text: "Simplemente quieres entenderte mejor",
      },
      {
        type: "p",
        text: "No todo motivo para ir a terapia tiene que venir de un malestar. Querer conocerte más, procesar una etapa de cambio, o simplemente tener un espacio propio de reflexión, son razones tan válidas como cualquier otra.",
      },
      {
        type: "p",
        text: "Este artículo es informativo y no sustituye una valoración profesional. Si sientes que estás pasando por un momento particularmente difícil, no tienes que esperar a identificar todas estas señales para buscar apoyo.",
      },
      {
        type: "cta",
        text: "Da el primer paso cuando estés list@ — sin presión, a tu propio ritmo.",
        label: "Iniciar test de afinidad",
        href: "/encuentra",
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

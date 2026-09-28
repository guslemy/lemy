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
  // Palabras clave para el buscador de /biblioteca — no son visibles, solo
  // amplían qué texto se compara contra lo que alguien escribe en el buscador.
  tags: string[];
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
    tags: ["primera sesión", "empezar terapia", "nervios", "qué esperar", "primera vez"],
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
        href: "/test",
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
    tags: ["elegir terapeuta", "cómo elegir", "preguntas", "comparar terapeutas"],
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
        href: "/test",
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
    tags: ["en línea", "presencial", "modalidad", "virtual", "a distancia"],
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
    tags: [
      "enfoques",
      "cognitivo-conductual",
      "psicodinámico",
      "sistémico",
      "humanista",
      "gestalt",
      "emdr",
    ],
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
    tags: ["señales", "cuándo ir a terapia", "ansiedad", "salud mental", "momento de buscar ayuda"],
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
        href: "/test",
      },
    ],
  },
  {
    slug: "como-conseguir-mas-pacientes-psicologo-independiente-mexico",
    title: "Cómo conseguir más pacientes como psicólogo independiente en México: 7 estrategias que sí funcionan",
    metaDescription:
      "Estrategias reales para que psicólogos y terapeutas en México consigan más pacientes: presencia digital, boca a boca, plataformas y más. Guía práctica.",
    excerpt:
      "Conseguir pacientes de forma constante no depende solo de ser buen terapeuta — también de que te encuentren y confíen en ti antes de la primera sesión. Aquí 7 estrategias que sí funcionan.",
    publishedAt: "2026-09-15",
    authorName: "Equipo Lemy",
    readingMinutes: 7,
    tags: [
      "conseguir pacientes",
      "psicólogo independiente",
      "marketing para terapeutas",
      "terapeutas",
      "práctica privada",
      "méxico",
    ],
    blocks: [
      {
        type: "p",
        text: "Si acabas de independizarte o llevas años dando consulta pero sientes que tu agenda no crece al ritmo que te gustaría, no estás solo. El interés por la salud mental en México ha crecido muchísimo en los últimos años, pero eso también significa más terapeutas ofreciendo sus servicios y pacientes con más opciones para elegir. Conseguir pacientes de forma constante ya no depende solo de ser un buen terapeuta: también depende de que te puedan encontrar y de que confíen en ti antes de agendar la primera sesión.",
      },
      {
        type: "p",
        text: "Aquí van siete estrategias que realmente mueven la aguja, sin necesidad de convertirte en experto en marketing.",
      },
      {
        type: "h2",
        text: "1. Ten un perfil profesional claro y humano",
      },
      {
        type: "p",
        text: "Muchos psicólogos independientes no tienen ningún lugar donde un paciente potencial pueda conocerlos antes de escribirles. Un perfil breve —quién eres, en qué te especializas, cómo trabajas y qué pueden esperar de una primera sesión— reduce muchísimo la fricción. No necesita sonar clínico ni acartonado: entre más cercano y claro sea tu lenguaje, más fácil es que alguien dé el primer paso.",
      },
      {
        type: "h2",
        text: "2. Define tu especialidad (aunque atiendas de todo)",
      },
      {
        type: "p",
        text: "\"Doy terapia a todo tipo de pacientes\" es honesto, pero no ayuda a que te encuentren. Las personas buscan por necesidad específica: ansiedad, duelo, terapia de pareja, adolescentes. Elegir uno o dos enfoques para presentarte hacia afuera —sin que eso limite a quién realmente atiendes— facilita que aparezcas en la búsqueda correcta y que la persona sienta \"este terapeuta es para mí.\"",
      },
      {
        type: "h2",
        text: "3. Aprovecha el boca a boca, pero dale una salida fácil",
      },
      {
        type: "p",
        text: "Sigue siendo, por mucho, la forma más común en que la gente encuentra terapeuta. El problema es que muchas recomendaciones se pierden porque la persona recomendada no sabe cómo dar el siguiente paso. Facilita ese camino: un enlace directo para agendar, un número de WhatsApp, algo que no dependa de que alguien \"te busque en Facebook y te escriba.\"",
      },
      {
        type: "h2",
        text: "4. Ten presencia digital, aunque sea mínima",
      },
      {
        type: "p",
        text: "No necesitas ser influencer ni publicar todos los días. Basta con que exista un lugar donde la gente pueda verificar que eres real, ver tu formación y encontrar tu contacto: un perfil en Google, en Instagram o en una plataforma especializada. Para búsquedas locales (\"psicólogo en Oaxaca\", \"terapia en línea México\") esto también ayuda a que aparezcas cuando alguien te está buscando activamente, no solo cuando te recomiendan.",
      },
      {
        type: "h2",
        text: "5. Facilita agendar la primera cita",
      },
      {
        type: "p",
        text: "Uno de los puntos donde más pacientes potenciales se pierden es entre \"quiero agendar\" y realmente lograrlo. Si el proceso implica varios mensajes de ida y vuelta para cuadrar un horario, muchas personas simplemente no vuelven a escribir. Un sistema de agenda donde la persona vea tu disponibilidad real y reserve en el momento reduce esa fricción de forma enorme, sobre todo con quienes están dando el paso de buscar ayuda por primera vez y ya les costó suficiente trabajo decidirse.",
      },
      {
        type: "h2",
        text: "6. Ofrece terapia en línea, no solo presencial",
      },
      {
        type: "p",
        text: "Cada vez más pacientes prefieren —o necesitan— la opción de conectarse desde casa o desde el trabajo. Ofrecer modalidad en línea, con videollamada integrada y sin que el paciente tenga que instalar nada complicado, amplía tu alcance más allá de tu colonia o ciudad, y te da flexibilidad para llenar horarios que de otra forma quedarían vacíos.",
      },
      {
        type: "h2",
        text: "7. Cuida la experiencia después de la primera sesión",
      },
      {
        type: "p",
        text: "Conseguir un paciente nuevo cuesta más que retener uno. Recordatorios de cita, un cobro simple y sin fricción, y un canal claro para reagendar hacen que la persona regrese a la segunda y tercera sesión en lugar de perderse en el camino. Esa continuidad es, con el tiempo, la que realmente sostiene una práctica llena.",
      },
      {
        type: "h2",
        text: "Todo esto, sin tener que armarlo tú desde cero",
      },
      {
        type: "p",
        text: "Construir cada una de estas piezas por separado —perfil, agenda en línea, videollamada, cobros, recordatorios— toma tiempo que la mayoría de los terapeutas prefiere invertir en sus pacientes, no en aprender herramientas nuevas.",
      },
      {
        type: "cta",
        text: "Por eso existe Lemy: un espacio donde los pacientes en Oaxaca te encuentran, agendan contigo (presencial o en línea, con Google Meet integrado), pagan de forma segura y reciben sus recordatorios automáticamente. Tú te enfocas en dar terapia; Lemy se encarga del resto. Si quieres probarlo sin compromiso, Lemy tiene 15 días de prueba gratuita para terapeutas.",
        label: "Crear mi perfil",
        href: "/login?flujo=terapeuta",
      },
    ],
  },
  {
    slug: "cuanto-cobrar-sesion-terapia-mexico-guia-precios",
    title: "Cuánto cobrar por sesión de terapia en México: guía práctica de precios (2026)",
    metaDescription:
      "Guía 2026 para psicólogos en México: rangos de precio por sesión (presencial y online), qué factores mueven tu tarifa y cómo subirla sin perder pacientes.",
    excerpt:
      "¿Cuánto cobrar por sesión? Rangos reales para terapeutas en México, los factores que sí mueven tu tarifa, y cómo subirla sin sentir que le fallas a tus pacientes.",
    publishedAt: "2026-09-15",
    authorName: "Equipo Lemy",
    readingMinutes: 6,
    tags: [
      "cuánto cobrar",
      "precios de terapia",
      "tarifas para terapeutas",
      "terapeutas",
      "psicólogo independiente",
      "méxico",
    ],
    blocks: [
      {
        type: "h2",
        text: "¿Por qué cuesta tanto trabajo poner un precio?",
      },
      {
        type: "p",
        text: "Si eres psicólogo o psicoterapeuta independiente en México, seguro te ha pasado: alguien pregunta \"¿cuánto cobras por sesión?\" y dudas. Cobrar poco para no \"espantar\" pacientes, cobrar como tu colega de CDMX aunque trabajes en Oaxaca, o simplemente no saber si tu tarifa está muy por debajo (o por arriba) del mercado son dudas comunes, y no tiene nada que ver con que seas mal terapeuta. Tiene que ver con que nadie te enseñó a poner precio a tu trabajo en la carrera.",
      },
      {
        type: "p",
        text: "Aquí van rangos reales, los factores que sí mueven tu tarifa, y algunas ideas para subirla sin sentir que estás siendo injusto con tus pacientes.",
      },
      {
        type: "h2",
        text: "¿Cuánto se cobra hoy por una sesión en México?",
      },
      {
        type: "p",
        text: "Los precios varían mucho según ciudad, modalidad y experiencia, pero como referencia general:",
      },
      {
        type: "ul",
        items: [
          "Consulta presencial particular: entre $500 y $1,500 MXN por sesión en ciudades grandes; terapeutas con mucha experiencia o especialidades muy demandadas superan los $2,000.",
          "Zonas periféricas o ciudades más pequeñas: es común encontrar tarifas desde $200 a $400 MXN.",
          "Primera consulta: suele cobrarse un poco más que las de seguimiento (entre $800 y $1,300 MXN en zonas urbanas), porque implica una evaluación inicial más larga.",
          "Terapia en línea: generalmente más accesible, entre $300 y $800 MXN por sesión, aunque puede llegar a $1,500 MXN dependiendo del terapeuta.",
        ],
      },
      {
        type: "p",
        text: "Estos son puntos de referencia, no una regla. Tu tarifa ideal depende de tu contexto específico.",
      },
      {
        type: "h2",
        text: "Qué factores mueven realmente tu tarifa",
      },
      {
        type: "p",
        text: "Tu experiencia y formación. Una cédula profesional, especialidades, certificaciones o años de trayectoria justifican cobrar por arriba del promedio. No es presunción, es que tu tiempo de formación tiene valor.",
      },
      {
        type: "p",
        text: "Tu ciudad y el costo de vida local. Cobrar lo mismo que un colega en CDMX no siempre tiene sentido si vives en una ciudad con otro costo de vida, y viceversa: si tu consultorio está en una zona con renta alta, tu tarifa debe reflejarlo.",
      },
      {
        type: "p",
        text: "La modalidad. La terapia en línea suele costar un poco menos que la presencial (no siempre), en parte porque tú también ahorras en renta de consultorio, transporte y tiempo entre pacientes.",
      },
      {
        type: "p",
        text: "Tu especialidad. Terapia de pareja, duelo, trauma complejo o modalidades muy específicas (EMDR, terapia familiar sistémica) suelen tener tarifas distintas a la consulta general.",
      },
      {
        type: "p",
        text: "Paquetes vs. sesión suelta. Ofrecer paquetes de varias sesiones con un pequeño descuento puede ayudarte a asegurar continuidad en el tratamiento sin bajar tu tarifa base.",
      },
      {
        type: "h2",
        text: "Cómo subir tu tarifa sin perder pacientes",
      },
      {
        type: "p",
        text: "Subir precios da miedo, pero hay formas de hacerlo con cuidado:",
      },
      {
        type: "ul",
        items: [
          "Avisa con anticipación. Un mensaje simple, con al menos 30 días de aviso, es suficiente para la mayoría de los pacientes.",
          "Aplica el aumento a pacientes nuevos primero. Si te sientes incómodo subiendo la tarifa a quien ya está en proceso contigo, puedes empezar por los pacientes nuevos y ajustar a los actuales más adelante.",
          "No te compares únicamente con el precio más bajo del mercado. Compararte con quien cobra menos te empuja a una carrera hacia abajo que no es sostenible para tu práctica a largo plazo.",
          "Recuerda que un precio muy bajo también comunica algo. Cobrar por debajo de tu valor real puede generar más cancelaciones y menos compromiso con el proceso, precisamente porque el paciente no percibe el valor del espacio.",
        ],
      },
      {
        type: "h2",
        text: "Cobrar no tiene que ser lo más incómodo de tu semana",
      },
      {
        type: "p",
        text: "Más allá de cuánto cobras, cómo cobras también importa. Perseguir pagos, mandar recordatorios por WhatsApp o llevar un Excel de quién pagó y quién no le resta tiempo a lo que realmente sabes hacer: acompañar a tus pacientes.",
      },
      {
        type: "cta",
        text: "En Lemy te ayudamos con esa parte. Tus pacientes agendan y pagan su sesión en automático al reservar (presencial o por Google Meet), sin que tengas que perseguir a nadie, y tú tienes tu agenda y tu catálogo de servicios en un solo lugar. Si quieres probarlo sin compromiso, tenemos 15 días de prueba gratuita para terapeutas — sin tarjeta, sin letras chiquitas.",
        label: "Crear mi perfil",
        href: "/login?flujo=terapeuta",
      },
    ],
  },
  {
    slug: "facturacion-resico-psicologos-independientes-mexico",
    title: "Facturación y RESICO para psicólogos independientes en México: guía práctica 2026",
    metaDescription:
      "Guía 2026 para psicólogos en México: qué es RESICO, cómo facturar tus sesiones con CFDI, si tu servicio paga IVA y cómo evitar errores con el SAT.",
    excerpt:
      "RESICO, IVA, CFDI 4.0 y qué pueden deducir tus pacientes — la guía sin rodeos para poner en orden la parte fiscal de tu consulta.",
    publishedAt: "2026-09-28",
    authorName: "Equipo Lemy",
    readingMinutes: 7,
    tags: [
      "facturación",
      "resico",
      "impuestos",
      "sat",
      "psicólogo independiente",
      "terapeutas",
      "méxico",
    ],
    blocks: [
      {
        type: "p",
        text: "Si das terapia por tu cuenta, probablemente la parte administrativa —facturar, declarar, entender qué régimen te conviene— te quita más tranquilidad que cualquier caso clínico. No estás solo: es de los temas que más dudas genera entre psicólogos independientes en México, y la información suele estar dispersa o pensada para otras profesiones. Aquí va lo esencial, explicado en términos simples.",
      },
      {
        type: "h2",
        text: "¿Qué es RESICO y por qué le conviene a la mayoría de los terapeutas?",
      },
      {
        type: "p",
        text: "El Régimen Simplificado de Confianza (RESICO) es, hoy por hoy, la opción más común para psicólogos que facturan por honorarios de forma independiente. Sus ventajas prácticas:",
      },
      {
        type: "ul",
        items: [
          "Pagas ISR sobre una tasa reducida (entre 1% y 2.5% según tu nivel de ingresos), no sobre utilidad.",
          "No necesitas llevar contabilidad electrónica compleja.",
          "Aplica si tus ingresos anuales no superan los $3,500,000 MXN en el ejercicio anterior.",
          "Debes ser persona física dedicada a servicios profesionales (como honorarios de psicología) y no ser socio o accionista de una persona moral, salvo algunas excepciones.",
        ],
      },
      {
        type: "p",
        text: "Si facturas por debajo de ese tope y no tienes otras complicaciones fiscales, RESICO suele ser más simple y barato que el régimen de Actividades Empresariales y Profesionales tradicional. Aun así, cada caso tiene matices —sobre todo si combinas consulta privada con un empleo formal o con ingresos de otras fuentes—, así que vale la pena revisarlo con un contador antes de darte de alta.",
      },
      {
        type: "h2",
        text: "¿Tu servicio como psicólogo paga IVA?",
      },
      {
        type: "p",
        text: "Aquí hay un mito muy extendido: muchos terapeutas asumen que, como los servicios médicos, la psicología está exenta de IVA. No es así. La exención de IVA para servicios de salud se limita a médicos, veterinarios y dentistas; los servicios de psicología sí causan IVA al 16%. Vale la pena confirmarlo con tu contador para que tus facturas salgan correctas desde el principio y no tengas sorpresas en tu declaración.",
      },
      {
        type: "h2",
        text: "Cómo facturar tus sesiones, paso a paso",
      },
      {
        type: "ul",
        items: [
          "Dado de alta ante el SAT como persona física en RESICO (o el régimen que te corresponda), con tu cédula profesional a la mano.",
          "Emite un CFDI 4.0 por cada cobro, usando la clave de producto/servicio del catálogo SAT para servicios de psicología (85121608).",
          "Usa una descripción genérica y discreta, como \"sesión de psicoterapia individual\", con la fecha del servicio. Evita anotar diagnósticos o detalles clínicos en la factura: no es necesario y protege la confidencialidad de tu paciente.",
          "Conserva un respaldo del cobro (transferencia, tarjeta o comprobante de pago) que corresponda con cada factura emitida.",
        ],
      },
      {
        type: "h2",
        text: "¿Tus pacientes pueden deducir la terapia?",
      },
      {
        type: "p",
        text: "Sí, y es un argumento que puedes usar a tu favor al hablar de tarifas. Conforme al Artículo 151 de la Ley del ISR, las personas físicas pueden deducir los honorarios pagados a psicólogos siempre que el profesional tenga título y cédula legalmente expedidos. Hay una condición clave: el pago debe hacerse por un medio electrónico —tarjeta, transferencia o cheque nominativo—, nunca en efectivo, o la deducción se pierde automáticamente. Cuando cobras tus sesiones por una plataforma que registra el pago electrónicamente, como Lemy, le facilitas a tu paciente ese respaldo sin que tengas que hacer nada extra.",
      },
      {
        type: "h2",
        text: "Errores comunes que te pueden costar caro",
      },
      {
        type: "ul",
        items: [
          "Dar por hecho que estás exento de IVA sin haberlo confirmado.",
          "Aceptar solo efectivo y luego no poder justificar tus ingresos ante el SAT.",
          "Anotar información clínica sensible en la descripción de la factura.",
          "Mezclar cobros personales y de consulta en la misma cuenta bancaria, lo que complica tu contabilidad.",
          "Postergar el alta fiscal \"hasta tener más pacientes\": entre más tarde empieces a facturar en forma, más difícil es ordenar el historial después.",
        ],
      },
      {
        type: "p",
        text: "Ninguno de estos puntos sustituye el consejo de un contador —cada situación fiscal tiene sus particularidades—, pero conocerlos te ayuda a llegar a esa conversación con las preguntas correctas.",
      },
      {
        type: "h2",
        text: "Lo administrativo no debería quitarte tiempo de consulta",
      },
      {
        type: "cta",
        text: "Entre agendar, dar seguimiento y ahora también facturar, es fácil que la parte operativa de tu práctica termine comiéndose las horas que quisieras dedicar a tus pacientes. En Lemy conectamos a terapeutas verificados con pacientes en Oaxaca y cada cobro se procesa con Stripe, de forma electrónica y trazable —justo el tipo de comprobante que tus pacientes necesitan para deducir su terapia. Si quieres ver cómo funciona, tienes 15 días de prueba gratis para explorar la plataforma sin compromiso.",
        label: "Crear mi perfil",
        href: "/login?flujo=terapeuta",
      },
    ],
  },
  {
    slug: "automatizar-agenda-citas-terapeutas-mexico-reducir-inasistencias",
    title: "Cómo automatizar tu agenda de citas y reducir las inasistencias (guía para terapeutas en México)",
    metaDescription:
      "Guía para psicólogos en México: cómo automatizar recordatorios de citas, reducir inasistencias y recuperar horas de consulta sin perseguir pacientes.",
    excerpt:
      "Cada cita que se cae sin aviso es una hora que no se recupera. Así se automatiza una agenda de consultorio sin perder el trato humano.",
    publishedAt: "2026-09-28",
    authorName: "Equipo Lemy",
    readingMinutes: 6,
    tags: [
      "agenda",
      "inasistencias",
      "recordatorios",
      "automatización",
      "terapeutas",
      "psicólogo independiente",
      "méxico",
    ],
    blocks: [
      {
        type: "h2",
        text: "El costo silencioso de una agenda manual",
      },
      {
        type: "p",
        text: "Si llevas tu consultorio por tu cuenta, probablemente conoces esta escena: agendas una cita por WhatsApp el lunes, el paciente no confirma, y el jueves llega el hueco vacío en tu horario. No es falta de compromiso del paciente casi siempre — es simple olvido. Y cada sesión que se cae sin aviso es una hora de tu tiempo que no se recupera.",
      },
      {
        type: "p",
        text: "Según reportan clínicas y consultorios que ya automatizaron sus recordatorios, un aviso por WhatsApp o correo uno o dos días antes de la sesión reduce las inasistencias de forma notable, sin que el terapeuta tenga que escribir un solo mensaje manual. El problema es que armar ese sistema por tu cuenta —con Calendly, un bot de WhatsApp, una hoja de cálculo y recordatorios manuales— toma tiempo que probablemente prefieres invertir en tus pacientes, no en herramientas.",
      },
      {
        type: "h2",
        text: "Qué significa \"automatizar la agenda\" en la práctica",
      },
      {
        type: "p",
        text: "No se trata de reemplazar el vínculo humano con tus pacientes. Automatizar tu agenda significa quitarte de encima las tareas repetitivas que no requieren tu criterio clínico:",
      },
      {
        type: "ul",
        items: [
          "Confirmación automática de cada cita al momento de agendarla.",
          "Recordatorios programados 24–48 horas antes, por correo o WhatsApp.",
          "Reprogramación y cancelación sin que tengas que intervenir cada vez.",
          "Liberación automática del horario cuando alguien cancela, para que otro paciente pueda tomarlo.",
          "Un solo lugar donde ver tu semana completa, sin cruzar tres apps distintas.",
        ],
      },
      {
        type: "p",
        text: "El efecto acumulado es más ocupación real de tu agenda, menos tiempo administrativo y menos fricción para que un paciente nuevo llegue a su primera sesión.",
      },
      {
        type: "h2",
        text: "Por qué esto le importa a tu práctica, no solo a tu calendario",
      },
      {
        type: "p",
        text: "Un consultorio que pierde el 15-20% de sus citas por inasistencias no solo pierde ingresos ese día: pierde continuidad terapéutica con ese paciente, y pierde el tiempo que pudo haber dado a alguien en lista de espera. La automatización no es un lujo tecnológico — es lo que separa a un terapeuta que trabaja \"lleno\" de uno que trabaja con la agenda a medias sin darse cuenta del porqué.",
      },
      {
        type: "p",
        text: "También hay un tema legal a tener en cuenta: si vas a enviar recordatorios por WhatsApp, conviene pedir el consentimiento del paciente desde la primera cita, en línea con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Un sistema que ya contempla esto de inicio te ahorra un dolor de cabeza después.",
      },
      {
        type: "h2",
        text: "Cómo elegir entre armarlo tú mismo o usar una plataforma que ya lo resuelve",
      },
      {
        type: "p",
        text: "Si tienes pocos pacientes, un calendario compartido y recordatorios manuales pueden bastarte por un tiempo. Pero conforme crece tu práctica, coordinar agenda, pagos y recordatorios en herramientas separadas empieza a consumir horas que no facturas. Las opciones reales son:",
      },
      {
        type: "ul",
        items: [
          "Armar tu propio stack: un Calendly o Google Calendar + un servicio de WhatsApp Business + recordatorios manuales. Funciona, pero tú administras cada pieza y cada actualización.",
          "Un software especializado para consultorios de psicología: automatiza recordatorios y confirmaciones, pero normalmente no incluye el cobro de la sesión ni la videollamada en el mismo flujo.",
          "Una plataforma como Lemy, donde agenda, pago y sesión (por Google Meet o presencial) viven en un solo lugar: el paciente agenda, confirma, paga y recibe su recordatorio automáticamente, y tú solo te preocupas por dar la sesión.",
        ],
      },
      {
        type: "p",
        text: "Ninguna opción es \"la correcta\" para todos — depende de cuánto tiempo administrativo estás dispuesto a seguir absorbiendo tú mismo.",
      },
      {
        type: "h2",
        text: "Empieza por lo simple",
      },
      {
        type: "p",
        text: "Si hoy agendas por WhatsApp y llevas tu calendario en la cabeza, no necesitas resolver todo de golpe. Empieza por automatizar una sola cosa: los recordatorios. Es el cambio con menor esfuerzo y mayor impacto inmediato en tus inasistencias.",
      },
      {
        type: "cta",
        text: "En Lemy, la agenda, los recordatorios y el cobro de tus sesiones —por Stripe— ya vienen integrados desde el primer día, sin que tengas que armar nada por tu cuenta. Prueba gratis durante 15 días y da de alta tu perfil de terapeuta hoy mismo.",
        label: "Crear mi perfil",
        href: "/login?flujo=terapeuta",
      },
    ],
  },
  {
    slug: "como-cobrar-sesiones-terapia-en-linea-mexico-guia-practica",
    title: "Cómo cobrar sesiones de terapia en línea en México: guía práctica",
    metaDescription:
      "Guía para psicólogos en México: cómo cobrar terapia en línea con Stripe, qué recibos dar a tus pacientes y los errores más comunes al gestionar pagos.",
    excerpt:
      "Agendar y dar la sesión es la parte fácil. Así se cobra terapia en línea en México sin perseguir pacientes por WhatsApp.",
    publishedAt: "2026-09-28",
    authorName: "Equipo Lemy",
    readingMinutes: 6,
    tags: [
      "cobrar terapia en línea",
      "stripe",
      "pagos",
      "facturación",
      "terapeutas",
      "psicólogo independiente",
      "méxico",
    ],
    blocks: [
      {
        type: "h2",
        text: "El dolor de cabeza silencioso de dar terapia en línea",
      },
      {
        type: "p",
        text: "Si ya diste el salto a la consulta online, seguramente descubriste algo que nadie te contó en la universidad: agendar y dar la sesión es la parte fácil. Cobrarla —de forma ordenada, profesional y sin perseguir a tus pacientes por WhatsApp— es otro tema. Entre transferencias que \"ya te las mando\", pacientes que olvidan pagar antes de la sesión y la pregunta incómoda de si necesitas facturar, muchos terapeutas terminan resolviendo los pagos a la mitad, con calculadora y buena fe.",
      },
      {
        type: "p",
        text: "Aquí va una guía clara de cómo cobrar sesiones de terapia en línea en México, qué opciones existen y cómo evitar los errores que más le quitan tiempo (y paz mental) a los psicólogos independientes.",
      },
      {
        type: "h2",
        text: "Tus opciones reales para cobrar terapia en línea",
      },
      {
        type: "p",
        text: "En México, un terapeuta que da consulta en línea suele elegir entre alguna de estas rutas:",
      },
      {
        type: "ul",
        items: [
          "Transferencia SPEI directa. Compartes tu CLABE y esperas el comprobante. Funciona, pero depende de la memoria del paciente y tú cargas con el seguimiento manual.",
          "Links de pago con tarjeta (Stripe, PayPal). El paciente paga desde un link o formulario, sin que compartas tus datos bancarios cada vez.",
          "Terminal física o cobro en el momento, útil si también atiendes presencial, pero no resuelve las sesiones por Meet o Zoom.",
          "Plataformas que integran agenda y cobro, como Lemy, donde el pago se procesa automáticamente al agendar o confirmar la cita.",
        ],
      },
      {
        type: "h2",
        text: "Por qué tantos terapeutas están migrando a Stripe",
      },
      {
        type: "p",
        text: "Stripe se volvió el estándar para cobrar consulta en línea en México y Latinoamérica por tres razones prácticas: no tiene cuota fija mensual, acepta tarjetas nacionales e internacionales, y genera un link de pago en minutos. Lo importante: Stripe no decide tus políticas de cobro, solo procesa el pago — cuándo cobras y qué pasa con cancelaciones lo sigues definiendo tú.",
      },
      {
        type: "h2",
        text: "¿Y la facturación?",
      },
      {
        type: "p",
        text: "Si en algún momento un paciente pide factura (CFDI), esto es independiente del método de cobro. Lo que sí conviene es mantener un registro simple por paciente y nunca incluir información clínica en el recibo — solo el concepto (\"sesión de terapia\" o \"servicios profesionales\").",
      },
      {
        type: "h2",
        text: "Por sesión, por paquete o mensual: elige un modelo y sé consistente",
      },
      {
        type: "ul",
        items: [
          "Pago por sesión, antes o justo después de cada consulta.",
          "Paquetes prepagados (por ejemplo, 4 sesiones).",
          "Cobro mensual recurrente, común con pacientes de seguimiento estable.",
        ],
      },
      {
        type: "p",
        text: "Lo que importa no es cuál elijas, sino ser consistente y comunicarlo desde la primera sesión.",
      },
      {
        type: "h2",
        text: "Errores comunes que vale la pena evitar",
      },
      {
        type: "ul",
        items: [
          "Cobrar \"cuando se pueda\" en vez de fijar un momento claro.",
          "Compartir tu CLABE personal en cada conversación en vez de un link reutilizable.",
          "No tener ningún respaldo o recibo.",
          "Mezclar temas de dinero con contenido clínico en el mismo mensaje.",
        ],
      },
      {
        type: "h2",
        text: "Cómo Lemy simplifica todo esto",
      },
      {
        type: "p",
        text: "En Lemy, el cobro va integrado directo en la agenda: cuando un paciente reserva una cita, el pago se procesa vía Stripe Connect sin que envíes un solo link manualmente.",
      },
      {
        type: "cta",
        text: "¿Quieres probarlo sin compromiso? Lemy tiene una prueba gratuita de 15 días para terapeutas.",
        label: "Crear mi perfil",
        href: "/login?flujo=terapeuta",
      },
    ],
  },
  {
    slug: "terapia-en-linea-mexico-requisitos-legales-psicologos",
    title: "¿Tus sesiones de terapia en línea son legales? Esto exige la ley en México (2026)",
    metaDescription:
      "Guía 2026 para psicólogos en México: cédula profesional, consentimiento informado y protección de datos para dar terapia en línea sin riesgos legales.",
    excerpt:
      "Cédula vigente, consentimiento informado y protección de datos — los tres pilares que separan una práctica en línea protegida de una con riesgo legal.",
    publishedAt: "2026-09-28",
    authorName: "Equipo Lemy",
    readingMinutes: 7,
    tags: [
      "requisitos legales",
      "cédula profesional",
      "consentimiento informado",
      "protección de datos",
      "terapeutas",
      "psicólogo independiente",
      "méxico",
    ],
    blocks: [
      {
        type: "h2",
        text: "¿Necesitas cédula profesional para dar terapia en línea?",
      },
      {
        type: "p",
        text: "Sí. En México, para ejercer la psicología —ya sea en consultorio o por videollamada— necesitas título universitario y cédula profesional expedida por la Secretaría de Educación Pública (SEP). La ley no distingue entre terapia presencial y terapia en línea: si brindas atención psicológica, necesitas estar registrado ante la Dirección General de Profesiones, sin importar el medio.",
      },
      {
        type: "p",
        text: "Esto es una buena noticia disfrazada de trámite: significa que cuando un paciente busca terapia en línea y encuentra tu perfil verificado, sabe que está hablando con alguien acreditado, no con cualquier persona que decidió llamarse \"coach\" o \"terapeuta\" sin formación clínica. Tu cédula es, en el fondo, tu carta de confianza.",
      },
      {
        type: "p",
        text: "A partir de marzo de 2026, la SEP permite tramitar la cédula profesional completamente en línea, lo que ha simplificado bastante el proceso para quienes apenas están certificándose. Si ya tienes la tuya, puedes verificar que esté correctamente registrada en cedulaprofesional.sep.gob.mx — vale la pena revisarlo una vez al año, sobre todo si vas a mostrar tu cédula en un perfil público.",
      },
      {
        type: "h2",
        text: "¿Qué pasa si das terapia sin cédula?",
      },
      {
        type: "p",
        text: "No es un detalle menor. Ejercer sin cédula profesional puede derivar en multas (que en algunos estados superan los $50,000 pesos), el cierre del espacio donde ofreces el servicio, y en casos graves —cuando se considera que el servicio pone en riesgo la salud de alguien— hasta consecuencias penales bajo la Ley Reglamentaria del Artículo 5º Constitucional. Más allá de lo legal, también está lo profesional: pacientes y plataformas serias piden ver tu cédula antes de trabajar contigo, y no tenerla cierra puertas.",
      },
      {
        type: "p",
        text: "Si estás en proceso de titulación o trámite de cédula, es momento de avanzarlo. La mayoría de las plataformas de terapia —Lemy incluida— piden verificar este documento antes de activar tu perfil.",
      },
      {
        type: "h2",
        text: "Consentimiento informado: el documento que no puedes saltarte",
      },
      {
        type: "p",
        text: "Dar terapia a distancia trae una responsabilidad adicional: el paciente debe aceptar explícitamente la modalidad en línea, no solo el tratamiento en general. Un buen consentimiento informado para terapia virtual debe explicar, en lenguaje claro:",
      },
      {
        type: "ul",
        items: [
          "Que la atención se brinda a distancia y qué implica eso.",
          "Los riesgos técnicos de la modalidad (fallas de conexión, interrupciones, problemas de privacidad en el hogar del paciente).",
          "Qué plataforma usan para las sesiones y cómo se protege esa información.",
          "El procedimiento a seguir en caso de una emergencia durante una sesión virtual.",
          "La política de reprogramación cuando hay fallas técnicas.",
        ],
      },
      {
        type: "p",
        text: "No hace falta que sea un documento de diez páginas. Sí hace falta que exista, que el paciente lo firme antes de la primera sesión, y que lo guardes. Es tanto una protección legal para ti como una forma de generar confianza desde el primer contacto.",
      },
      {
        type: "h2",
        text: "Protección de datos: tu responsabilidad con la información del paciente",
      },
      {
        type: "p",
        text: "La Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) aplica directamente a quienes ejercen terapia de forma independiente. En la práctica, esto significa:",
      },
      {
        type: "ul",
        items: [
          "Tener un aviso de privacidad que explique qué datos recolectas del paciente y para qué los usas.",
          "Usar plataformas de videollamada con cifrado y buenas prácticas de seguridad (evita links genéricos sin control de acceso).",
          "No grabar sesiones salvo que exista consentimiento explícito por escrito y una razón clínica que lo justifique.",
          "Trabajar desde dispositivos protegidos con contraseña, software actualizado, y evitar redes wifi públicas al dar consulta.",
        ],
      },
      {
        type: "p",
        text: "Ninguno de estos puntos requiere presupuesto de clínica grande. Son hábitos, y una vez que los adoptas se vuelven automáticos.",
      },
      {
        type: "h2",
        text: "Lo legal no tiene que sentirse abrumador",
      },
      {
        type: "p",
        text: "Si todo esto se siente como mucho trámite, tiene sentido — nadie estudió psicología para volverse experto en regulación de datos. Pero ordenar estos tres pilares (cédula vigente, consentimiento informado claro, buenas prácticas de privacidad) es lo que separa una práctica en línea sólida y protegida de una que vive con el riesgo de un problema legal esperando a suceder.",
      },
      {
        type: "cta",
        text: "En Lemy verificamos la cédula profesional de cada terapeuta antes de activar su perfil, así que tus pacientes saben desde el primer momento que están en buenas manos — y tú puedes enfocarte en dar terapia, no en resolver trámites solo. Prueba Lemy gratis durante 15 días y descubre cómo la plataforma te ayuda con agenda, pagos vía Stripe y visibilidad ante nuevos pacientes en Oaxaca y el resto de México.",
        label: "Crear mi perfil",
        href: "/login?flujo=terapeuta",
      },
    ],
  },
  {
    slug: "consultorio-virtual-o-presencial-psicologos-mexico",
    title: "Consultorio virtual o presencial: cómo elegir el modelo que más te conviene como psicólogo en México",
    metaDescription:
      "Guía para psicólogos en México: ventajas, límites y costos reales del consultorio presencial, virtual e híbrido, y cómo decidir cuál conviene a tu práctica.",
    excerpt:
      "Presencial, virtual o híbrido — no es una decisión menor. Aquí las preguntas y costos reales que te ayudan a elegir el modelo que más te conviene.",
    publishedAt: "2026-09-28",
    authorName: "Equipo Lemy",
    readingMinutes: 7,
    tags: [
      "consultorio virtual",
      "consultorio presencial",
      "modelo híbrido",
      "terapeutas",
      "psicólogo independiente",
      "méxico",
    ],
    blocks: [
      {
        type: "p",
        text: "Si llevas un tiempo dando terapia por tu cuenta, seguramente ya te ha pasado: un paciente potencial pregunta si das sesiones en línea, otro insiste en verte en persona, y tú sigues sin decidir si vale la pena rentar un consultorio, quedarte 100% virtual, o hacer un poco de ambos. No es una decisión menor — afecta tus costos, cuántos pacientes puedes atender, de dónde pueden venir (solo tu ciudad o todo México) y hasta cómo te sientes trabajando día a día. No hay una respuesta única. Pero sí hay preguntas concretas que te ayudan a decidir, y eso es lo que vemos aquí.",
      },
      {
        type: "h2",
        text: "Las ventajas reales del consultorio presencial",
      },
      {
        type: "p",
        text: "Dar terapia cara a cara sigue teniendo un lugar importante, especialmente en ciertos enfoques y con ciertos pacientes:",
      },
      {
        type: "ul",
        items: [
          "Algunas personas —y algunos procesos, como trabajo con niños, terapia de pareja o casos que requieren mayor contención— fluyen mejor en persona.",
          "Un espacio físico propio transmite seriedad y permanencia: para algunos pacientes, saber que existe \"un lugar\" al que pueden ir importa.",
          "Te evita depender por completo de que la conexión a internet del paciente (o la tuya) funcione bien ese día.",
          "Es más fácil generar referidos boca a boca dentro de una colonia o zona si tienes presencia física ahí.",
        ],
      },
      {
        type: "p",
        text: "La contraparte es el costo: renta, mobiliario, mantenimiento y el tiempo de traslado limitan cuántas horas puedes ofrecer y a quién. En ciudades como Oaxaca, donde el mercado de pacientes presenciales en una sola colonia puede ser reducido, esto también limita tu crecimiento.",
      },
      {
        type: "h2",
        text: "Las ventajas reales del consultorio virtual",
      },
      {
        type: "p",
        text: "La terapia en línea dejó de ser una alternativa de emergencia y hoy es, para muchos terapeutas, el modelo principal:",
      },
      {
        type: "ul",
        items: [
          "Puedes atender pacientes de cualquier parte de México (y del extranjero, si tu cédula y las regulaciones aplicables lo permiten), no solo de tu ciudad.",
          "Reduces a cero los costos de renta, servicios y traslado — lo que se traduce directamente en más margen por sesión.",
          "Tienes más flexibilidad de horario, lo cual facilita compaginar tu práctica con otro trabajo, con hijos o con estudios.",
          "Los pacientes con movilidad reducida, agendas complicadas o que viven en zonas alejadas encuentran más fácil sostener el tratamiento.",
        ],
      },
      {
        type: "p",
        text: "El reto está en la disciplina técnica (una buena conexión, un espacio silencioso y privado) y en que ciertos pacientes prefieren, al menos al inicio, el contacto presencial.",
      },
      {
        type: "h2",
        text: "El modelo híbrido: la opción que eligen cada vez más terapeutas",
      },
      {
        type: "p",
        text: "No tienes que elegir un bando para siempre. Muchos psicólogos en México operan hoy un modelo híbrido: consulta presencial unos días de la semana (a veces incluso rentando un consultorio compartido por horas, no de tiempo completo) y sesiones en línea el resto. Esto te permite:",
      },
      {
        type: "ul",
        items: [
          "Atender a pacientes locales que prefieren verte en persona sin perder el alcance nacional que da lo virtual.",
          "Reducir el costo fijo de renta, pagando solo por las horas que realmente usas el espacio físico.",
          "Probar qué modalidad prefiere tu tipo de paciente antes de comprometerte a un solo formato.",
        ],
      },
      {
        type: "h2",
        text: "Preguntas para ayudarte a decidir",
      },
      {
        type: "ul",
        items: [
          "¿Qué tan grande es el mercado de pacientes presenciales en tu zona, realista y no en el mejor de los casos?",
          "¿Cuánto de tu ingreso mensual actual se iría en renta y servicios si abrieras un consultorio de tiempo completo?",
          "¿Tu enfoque terapéutico y tus pacientes actuales funcionan igual de bien por videollamada?",
          "¿Prefieres la estructura de un horario fijo en un lugar físico, o te conviene más la flexibilidad de dar terapia desde donde estés?",
          "¿Te sentirías cómodo dando consulta a pacientes de otros estados de México, ampliando tu alcance más allá de tu ciudad?",
        ],
      },
      {
        type: "h2",
        text: "Costos que a veces se nos olvida comparar",
      },
      {
        type: "p",
        text: "Al hacer cuentas, no compares solo \"renta vs. nada\". Considera también:",
      },
      {
        type: "ul",
        items: [
          "Mobiliario, acondicionamiento acústico y mantenimiento del consultorio físico.",
          "El tiempo de traslado, que también tiene un costo (horas que no facturas).",
          "Una buena cámara, micrófono e internet estable para las sesiones virtuales.",
          "Cualquier plataforma o herramienta que uses para agendar, cobrar y dar seguimiento a tus pacientes, sea presencial o en línea.",
        ],
      },
      {
        type: "h2",
        text: "No tienes que resolverlo solo",
      },
      {
        type: "p",
        text: "Sea cual sea el modelo que elijas, lo que más tiempo te quita no suele ser la terapia en sí, sino la logística: agendar, confirmar, cobrar y mantener organizada tu práctica.",
      },
      {
        type: "cta",
        text: "Lemy te permite ofrecer sesiones presenciales y en línea (con Google Meet integrado) desde un mismo perfil, con agenda y cobros por Stripe ya resueltos, para que tú decidas el modelo de tu práctica sin que la administración te lo complique. Prueba gratuita de 15 días para terapeutas.",
        label: "Crear mi perfil",
        href: "/login?flujo=terapeuta",
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

-- Amplía el catálogo de enfoques terapéuticos con la lista categorizada del
-- Notion "Sugerencias para perfil del terapeuta" (Humanistas, Cognitivo-
-- Conductuales, Psicodinámicos, Sistémicos, Contextuales, Basadas en Trauma,
-- Neuropsicológicas, Otros enfoques). Gustavo confirmó el 2026-08-13 que ya
-- está validado.
--
-- SON BORRADORES escritos por Claude (nombre_coloquial/descripcion_coloquial),
-- igual que el catálogo de motivos de consulta en 0027 — pendiente de que
-- Gustavo los revise.
--
-- No se tocan las 6 filas existentes de 0002_seed_catalogos.sql (cognitivo-
-- conductual, gestalt, psicodinamica, sistemica, humanista, emdr) — son las
-- versiones "generales" de cada familia; aquí se agregan las variantes más
-- específicas del Notion, sin duplicar.
--
-- Se excluyen del Notion, a propósito:
-- - "Terapia Cognitivo-Conductual (TCC)" y "EMDR" bajo Basadas en Trauma: ya
--   existen como filas generales.
-- - "ACT" y "DBT" repetidos bajo Contextuales: ya se agregan una sola vez
--   (aparecen también en Cognitivo-Conductuales).
-- - "Terapia Contextual" y "Terapia basada en Evidencia": son descriptores
--   genéricos, no enfoques distintos (el propio Notion marca la segunda
--   como "característica", no como enfoque).
-- - Psicooncología, Psicogerontólogo, Especialista en Violencia y
--   perspectiva de género, Especialista en Diversidad sexual y de género,
--   Psicología perinatal, Especialistas en comportamiento suicida,
--   Evaluación psicológica: son poblaciones/especializaciones, no marcos
--   teóricos — encajan mejor como motivos de consulta (specialties) o como
--   una futura tabla de "especializaciones", no aquí. "Evaluación
--   psicológica" ya se agregó como motivo de consulta en 0027.

insert into public.therapeutic_approaches (nombre_tecnico, nombre_coloquial, descripcion_coloquial, slug) values
-- Humanistas
('Terapia Centrada en la Persona (Carl Rogers)', 'Centrada en ti, sin dirigir la conversación', 'Te acompañamos con calidez y sin juzgar, confiando en que tú tienes las respuestas — el terapeuta guía, no decide por ti.', 'centrada-en-la-persona'),
('Terapia Existencial', 'Para las grandes preguntas de la vida', 'Exploramos el sentido, la libertad y las decisiones que dan forma a tu vida, sobre todo en momentos de crisis o cambio.', 'existencial'),
('Logoterapia', 'Encontrar sentido incluso en lo difícil', 'Te ayudamos a encontrarle un propósito a lo que vives, incluso en las etapas más duras.', 'logoterapia'),
('Análisis Transaccional', 'Para entender cómo te relacionas con los demás', 'Analizamos los patrones detrás de cómo te comunicas y te vinculas con otras personas, para cambiar los que ya no te sirven.', 'analisis-transaccional'),
('Focusing', 'Escuchando lo que sientes en el cuerpo', 'Aprendes a notar las sensaciones físicas de tus emociones como una guía para entenderte mejor.', 'focusing'),
('Terapia Experiencial', 'Aprender haciendo, no solo hablando', 'Usamos ejercicios y vivencias dentro de la sesión, no solo la conversación, para que el cambio se sienta real.', 'experiencial'),
('Psicoterapia Integrativa Humanista', 'Una mezcla de enfoques centrados en ti', 'Combinamos varias herramientas humanistas según lo que tú necesites, en vez de seguir un solo método fijo.', 'integrativa-humanista'),
-- Cognitivo-Conductuales
('Terapia Racional Emotiva Conductual (TREC / REBT)', 'Cuestionando las creencias que te hacen daño', 'Identificamos las creencias rígidas detrás de tu malestar y las ponemos a prueba, para que pesen menos en cómo te sientes.', 'trec'),
('Terapia Dialéctico Conductual (DBT)', 'Herramientas para regular emociones intensas', 'Aprendes técnicas concretas para manejar emociones muy intensas y mejorar tus relaciones, con práctica entre sesiones.', 'dbt'),
('Terapia de Aceptación y Compromiso (ACT)', 'Aceptar lo que no puedes cambiar, actuar en lo que sí', 'En vez de pelear contra pensamientos difíciles, aprendes a convivir con ellos mientras avanzas hacia lo que de verdad te importa.', 'act'),
('Terapia Cognitiva Basada en Mindfulness (MBCT)', 'Mindfulness para cambiar patrones de pensamiento', 'Combinamos atención plena con herramientas cognitivas para que notes y sueltes los pensamientos que te atrapan.', 'mbct'),
('Terapia de Activación Conductual', 'Retomar poco a poco lo que te hace bien', 'Te ayudamos a volver a hacer, paso a paso, las actividades que se te dificultan cuando el ánimo está bajo.', 'activacion-conductual'),
('Terapia Metacognitiva', 'Cambiar tu relación con el ''darle vueltas''', 'Trabajamos con la manera en que piensas sobre tus propios pensamientos, para salir del ciclo de preocupación constante.', 'metacognitiva'),
-- Psicodinámicos
('Psicoanálisis', 'Explorando tu inconsciente a profundidad', 'Un proceso a largo plazo para entender cómo tu historia y tu inconsciente siguen influyendo en tu presente.', 'psicoanalisis'),
('Psicoterapia Psicodinámica', 'Tus patrones actuales, vistos desde tu historia', 'Conectamos lo que vives hoy con experiencias pasadas, para entender el porqué detrás de tus patrones.', 'psicoterapia-psicodinamica'),
('Psicología del Yo', 'Fortaleciendo tu capacidad de adaptarte', 'Trabajamos en fortalecer los recursos internos que usas para manejar el estrés y adaptarte a la vida diaria.', 'psicologia-del-yo'),
('Relaciones Objetales', 'Cómo tus vínculos tempranos marcan tus relaciones hoy', 'Exploramos cómo tus primeras relaciones importantes siguen apareciendo en tus vínculos actuales.', 'relaciones-objetales'),
('Psicología del Self', 'Reconstruyendo un sentido sólido de ti mismo/a', 'Trabajamos en fortalecer tu sentido de identidad y autoestima desde la raíz.', 'psicologia-del-self'),
('Psicoterapia Breve Psicodinámica', 'Psicodinámica, pero en menos tiempo', 'La misma mirada hacia tu historia, pero con un número de sesiones definido y un foco más concreto.', 'psicodinamica-breve'),
-- Sistémicos
('Terapia Familiar Sistémica', 'Trabajando con toda la dinámica familiar', 'Vemos a la familia como un sistema completo, no solo a una persona, para sanar la dinámica en conjunto.', 'familiar-sistemica'),
('Terapia de Pareja Sistémica', 'La relación como punto de partida', 'Trabajamos la relación como una unidad, entendiendo cómo cada quien influye en los patrones de la pareja.', 'pareja-sistemica'),
('Terapia Estratégica Breve', 'Soluciones concretas, en pocas sesiones', 'Nos enfocamos en el problema puntual que traes y diseñamos estrategias concretas para resolverlo rápido.', 'estrategica-breve'),
('Terapia Estructural', 'Reorganizando los roles dentro de la familia', 'Miramos cómo están organizados los roles y límites dentro de tu familia, y ajustamos lo que ya no funciona.', 'estructural'),
('Terapia Narrativa', 'Reescribiendo la historia que te cuentas', 'Exploramos la forma en que narras tu propia historia, para abrir espacio a versiones más útiles de ti mismo/a.', 'narrativa'),
('Terapia Centrada en Soluciones', 'Enfocada en lo que sí funciona', 'En vez de profundizar en el problema, ponemos la energía en lo que ya te ha funcionado y cómo hacer más de eso.', 'centrada-en-soluciones'),
-- Contextuales (tercera generación)
('Psicoterapia Analítico Funcional (FAP)', 'Usando la relación terapéutica como espejo', 'Trabajamos con lo que pasa entre tú y tu terapeuta en la sesión misma, como reflejo de tus relaciones fuera de ahí.', 'fap'),
('Terapia Centrada en la Compasión (CFT)', 'Aprender a tratarte con más compasión', 'Trabajamos en bajarle el volumen a tu autocrítica y desarrollar una voz interna más amable contigo mismo/a.', 'cft'),
-- Basadas en Trauma
('Brainspotting', 'Otra vía para procesar el trauma', 'Una técnica que usa la posición de la mirada para ayudarte a procesar experiencias difíciles a un nivel más profundo que solo hablar.', 'brainspotting'),
('Terapia Sensoriomotriz', 'Sanando el trauma también desde el cuerpo', 'Trabajamos con las sensaciones y reacciones físicas del trauma, no solo con el recuerdo o la emoción.', 'sensoriomotriz'),
('Somatic Experiencing', 'Liberar el trauma que quedó en el cuerpo', 'Ayudamos a tu cuerpo a completar y soltar las respuestas de estrés que quedaron atoradas tras una experiencia difícil.', 'somatic-experiencing'),
('Internal Family Systems (IFS)', 'Conociendo tus distintas ''partes'' internas', 'Exploramos las distintas partes de ti (la que protege, la que se lastima, la que juzga) para que trabajen juntas, no en conflicto.', 'ifs'),
-- Neuropsicológicas
('Rehabilitación Neuropsicológica', 'Recuperar y entrenar funciones cognitivas', 'Trabajamos memoria, atención y otras funciones cognitivas, por ejemplo después de una lesión o un diagnóstico neurológico.', 'rehabilitacion-neuropsicologica'),
('Neuropsicología Clínica', 'Evaluando cómo el cerebro afecta tu día a día', 'Evaluamos cómo funciona tu cerebro y cómo eso se relaciona con lo que te cuesta trabajo en el día a día.', 'neuropsicologia-clinica'),
-- Otros enfoques (solo los que son marco metodológico, no población/especialización)
('Psicología Positiva', 'Enfocada en tus fortalezas, no solo el problema', 'Ponemos el foco en tus fortalezas y en lo que te hace bien, además de trabajar lo que te trajo a terapia.', 'psicologia-positiva'),
('Terapia Integrativa', 'Combinando varios enfoques según lo que necesitas', 'No seguimos un solo método fijo — combinamos herramientas de distintos enfoques según lo que mejor te funcione a ti.', 'integrativa')
on conflict (slug) do nothing;

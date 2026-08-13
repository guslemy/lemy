-- Amplía el catálogo de "motivos de consulta" (tabla specialties) con la
-- lista del Notion "Sugerencias para perfil del terapeuta" — Gustavo
-- confirmó el 2026-08-13 que ya está validada (solo hay 3 cuentas de prueba,
-- del equipo de Lemy) y pidió mantener los nombres profesionales del Notion
-- como nombre_tecnico, con nombre_coloquial/descripcion_coloquial nuevos.
--
-- SON BORRADORES escritos por Claude, igual que plan-features.ts — Gustavo
-- los va a revisar/corregir, sobre todo el de "Comportamiento suicida" por
-- lo sensible del tema.
--
-- No se tocan las 10 filas existentes de 0002_seed_catalogos.sql (varias
-- traen slugs usados como filtro de categoría en la home — ver CATEGORIES
-- en directory-preview.tsx: ansiedad, pareja, duelo, autoestima, familia,
-- trauma). Estas son netas nuevas, sin duplicar lo que ya cubren esas 10:
-- "Depresión o bajo ánimo" ya la cubre 'depresion', "Problemas de pareja o
-- familia" ya la cubren 'pareja' + 'familia' por separado, "Estrés
-- postraumático / Trauma" ya la cubre 'trauma', "Adicciones" ya existe, y
-- "Duelo o pérdida" ya existe. "Otro" del Notion no se agrega como fila —
-- es un catch-all de formulario, no una especialidad real.

insert into public.specialties (nombre_tecnico, nombre_coloquial, descripcion_coloquial, slug) values
('Maternidad, paternidad y crianza', 'Maternidad, paternidad y crianza', 'Para acompañarte en los retos de ser mamá, papá o cuidador — desde el embarazo hasta la crianza del día a día.', 'crianza'),
('Identidad de género y diversidad sexual', 'Identidad de género y comunidad LGBTIQ+', 'Un espacio afirmativo para explorar tu identidad o tu expresión de género, sin juicios.', 'identidad-genero'),
('Sexualidad', 'Sexualidad', 'Para hablar de tu vida sexual, tus dudas o dificultades, en un espacio cómodo y sin pena.', 'sexualidad'),
('Neurodivergencia (TDAH, autismo, etc.)', 'Neurodivergencia (TDAH, autismo y más)', 'Para entender mejor tu forma de pensar y funcionar, y encontrar herramientas que sí se ajusten a ti.', 'neurodivergencia'),
('Estrés', 'Estrés', 'Para cuando sientes que traes demasiado encima y necesitas herramientas para bajarle al acelere.', 'estres'),
('Autoconocimiento y desarrollo personal', 'Autoconocimiento y desarrollo personal', 'Para conocerte mejor, entender tus patrones y crecer hacia la persona que quieres ser.', 'autoconocimiento'),
('Maltrato o violencia (pareja, familia u otro entorno)', 'Maltrato o violencia', 'Un espacio seguro para procesar y sanar experiencias de maltrato o violencia, vengan de donde vengan.', 'violencia'),
('Comportamiento suicida', 'Pensamientos o conductas suicidas', 'Si has tenido pensamientos de hacerte daño, aquí puedes encontrar acompañamiento profesional y sin juicios.', 'comportamiento-suicida'),
('Enfermedades crónicas', 'Enfermedades crónicas', 'Para el lado emocional de vivir con una enfermedad crónica — la tuya o la de alguien que cuidas.', 'enfermedades-cronicas'),
('Evaluación psicológica', 'Evaluación psicológica', 'Para cuando necesitas un diagnóstico o evaluación formal, con un reporte que puedas usar donde lo pidan.', 'evaluacion-psicologica')
on conflict (slug) do nothing;

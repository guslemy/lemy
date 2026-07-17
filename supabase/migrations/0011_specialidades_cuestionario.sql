-- Agrega las especialidades que faltaban en el catálogo, necesarias para que
-- el cuestionario de match cubra todas las categorías reales del sitio.

insert into public.specialties (nombre_tecnico, nombre_coloquial, descripcion_coloquial, slug) values
('Parentalidad y crianza', 'Maternidad, paternidad y crianza', 'Para acompañarte en el proceso de ser mamá, papá, o en cómo criar con más calma.', 'crianza'),
('Identidad de género y diversidad sexual', 'Identidad de género y comunidad LGBTIIQ+', 'Un espacio seguro para explorar tu identidad, sin juicios.', 'lgbtiiq'),
('Salud y bienestar sexual', 'Sexualidad', 'Para hablar de tu sexualidad sin pena y sin tabú.', 'sexualidad'),
('Neurodivergencia', 'Neurodivergencia', 'Para personas con TDAH, autismo u otras formas distintas de procesar el mundo.', 'neurodivergencia'),
('Violencia y maltrato', 'Maltrato o violencia', 'Para acompañarte si viviste o estás viviendo una situación de violencia.', 'violencia')
on conflict (slug) do nothing;

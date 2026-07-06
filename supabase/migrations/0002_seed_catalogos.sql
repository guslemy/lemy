-- Borrador de catálogo inicial — VALIDAR con los 10 terapeutas antes de usarlo en producción.
-- Aquí solo para poder probar el buscador durante el desarrollo.

insert into public.specialties (nombre_tecnico, nombre_coloquial, descripcion_coloquial, slug) values
('Trastornos de ansiedad', 'Ansiedad', 'Para cuando la preocupación o el nerviosismo no te dejan vivir tranquilo.', 'ansiedad'),
('Trastornos del estado de ánimo', 'Depresión y tristeza profunda', 'Para cuando sientes que no tienes energía ni ganas de nada.', 'depresion'),
('Terapia de pareja', 'Problemas de pareja', 'Para mejorar la comunicación y resolver conflictos en la relación.', 'pareja'),
('Terapia familiar', 'Conflictos familiares', 'Para sanar la dinámica y comunicación dentro de la familia.', 'familia'),
('Duelo', 'Pérdida de un ser querido', 'Para acompañarte en el proceso de una pérdida.', 'duelo'),
('Trastornos alimenticios', 'Relación con la comida', 'Para sanar tu relación con la comida y tu cuerpo.', 'alimentacion'),
('Adicciones', 'Adicciones', 'Para dejar atrás una dependencia que ya no quieres en tu vida.', 'adicciones'),
('Autoestima', 'Autoestima y autoconocimiento', 'Para aprender a quererte y conocerte mejor.', 'autoestima'),
('Estrés laboral / burnout', 'Estrés y burnout', 'Para cuando el trabajo te está desgastando.', 'estres-laboral'),
('Trauma / TEPT', 'Traumas', 'Para procesar experiencias difíciles que aún te afectan.', 'trauma')
on conflict (slug) do nothing;

insert into public.therapeutic_approaches (nombre_tecnico, nombre_coloquial, descripcion_coloquial, slug) values
('Terapia Cognitivo-Conductual (TCC)', 'Enfocada en cambiar hábitos de pensamiento', 'Identificamos los pensamientos que te hacen daño y los transformamos en herramientas prácticas.', 'cognitivo-conductual'),
('Terapia Gestalt', 'Enfocada en el aquí y ahora', 'Trabajamos con lo que sientes en el momento presente para que te conozcas mejor.', 'gestalt'),
('Psicoanálisis / Psicodinámica', 'Explorando tu historia y tu inconsciente', 'Entendemos el porqué de tus patrones actuales mirando hacia tu pasado.', 'psicodinamica'),
('Terapia Sistémica', 'Enfocada en tus relaciones y entorno', 'Vemos cómo tu familia, pareja o entorno influye en lo que vives.', 'sistemica'),
('Terapia Humanista', 'Centrada en ti como persona', 'Un espacio de acompañamiento cálido, sin juicios, para que te descubras.', 'humanista'),
('EMDR', 'Para reprocesar experiencias difíciles', 'Una técnica especializada para sanar traumas específicos.', 'emdr')
on conflict (slug) do nothing;

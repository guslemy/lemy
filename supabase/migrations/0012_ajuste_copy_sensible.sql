-- Suaviza la descripción de "violencia" en el cuestionario de match: describe
-- la experiencia (cómo te hace sentir una relación) en vez de pedirle a la
-- persona que se autonombre "víctima de violencia" para poder dar clic.
-- La etiqueta corta (nombre_coloquial) se sigue mostrando, pero como texto
-- secundario pequeño, no como el mensaje principal.

update public.specialties
set descripcion_coloquial = 'Si una relación —de pareja, familia o trabajo— te hace sentir con miedo, controlado(a) o lastimado(a).'
where slug = 'violencia';

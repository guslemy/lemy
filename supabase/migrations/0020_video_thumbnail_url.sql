-- Opcional: YouTube ya tiene una URL de thumbnail predecible a partir del ID
-- del video (no necesita esta columna, se deriva en código). Instagram y
-- TikTok no tienen ese patrón público, así que aquí se puede pegar a mano
-- una miniatura desde /dashboard/contenido. Si se deja vacío, /biblioteca
-- usa una portada ilustrada de la marca en su lugar (nunca un ícono
-- genérico de la plataforma).

alter table public.educational_content add column thumbnail_url text;

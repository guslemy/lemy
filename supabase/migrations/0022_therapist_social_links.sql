-- Links de redes sociales + WhatsApp público para el perfil estilo
-- "link in bio" del terapeuta. Viven en therapists (no en profiles) porque
-- esa tabla ya es de lectura pública (therapists_public_read) — evita tener
-- que exponer profiles.phone (que además se usa para avisos internos, no
-- necesariamente el mismo número que quieren publicar).
alter table public.therapists add column if not exists instagram_url text;
alter table public.therapists add column if not exists facebook_url text;
alter table public.therapists add column if not exists tiktok_url text;
alter table public.therapists add column if not exists whatsapp_public text;

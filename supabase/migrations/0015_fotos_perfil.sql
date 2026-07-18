-- Fotos de perfil de terapeutas — bucket público de Supabase Storage.
-- Convención de ruta: cada terapeuta sube a "<su-user-id>/archivo.ext", lo
-- que permite que las políticas de abajo restrinjan escritura solo al
-- dueño de esa carpeta (storage.foldername(name) parte la ruta por "/").

insert into storage.buckets (id, name, public)
values ('therapist-photos', 'therapist-photos', true)
on conflict (id) do nothing;

create policy "therapist_photos_public_read" on storage.objects
  for select using (bucket_id = 'therapist-photos');

create policy "therapist_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'therapist-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "therapist_photos_owner_update" on storage.objects
  for update using (
    bucket_id = 'therapist-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "therapist_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'therapist-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

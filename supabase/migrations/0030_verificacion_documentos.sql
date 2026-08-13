-- Documentos de verificación (cédula, identificación oficial, título
-- opcional) — bucket privado de Storage + rastreo de quién y cuándo aprobó.
--
-- Reutiliza la tabla therapist_credentials que ya existía desde 0001_init.sql
-- sin usarse (tipo/documento_url/verified). Convención de `tipo` para esta
-- función: 'cedula' | 'identificacion' | 'titulo' (los otros valores del
-- comentario original — 'licenciatura'/'maestria'/'diplomado'/'otro' — no
-- se usan aquí, no hay CHECK constraint que lo restrinja).
--
-- A diferencia de therapist-photos (0015), este bucket es PRIVADO: nadie
-- puede leer los documentos de otro terapeuta, ni siquiera con la URL — el
-- panel de admin genera URLs firmadas y temporales con el service_role,
-- que ignora RLS por completo.

alter table public.therapists
  add column if not exists verified_by uuid references public.profiles(id) on delete set null;

insert into storage.buckets (id, name, public)
values ('therapist-documents', 'therapist-documents', false)
on conflict (id) do nothing;

create policy "therapist_documents_owner_read" on storage.objects
  for select using (
    bucket_id = 'therapist-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "therapist_documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'therapist-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "therapist_documents_owner_update" on storage.objects
  for update using (
    bucket_id = 'therapist-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "therapist_documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'therapist-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

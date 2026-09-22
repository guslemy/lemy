-- A petición de Gustavo (2026-09-22): en la carpeta compartida de
-- documentos (bucket patient-documents, ver 0040), el paciente podía borrar
-- cualquier archivo de la carpeta —incluyendo, en teoría, un consentimiento
-- que nunca debería poder ver ni tocar— porque la política de DELETE
-- aceptaba a cualquiera de los dos ids en la ruta (terapeuta o paciente).
-- Se restringe: solo el terapeuta (dueño de la carpeta, primer segmento de
-- la ruta) puede borrar. Subir/leer siguen igual para ambos —
-- deletePatientDocument en ficha-actions.ts ya era terapeuta-only del lado
-- de la aplicación; esto cierra el mismo hueco a nivel de Storage.
drop policy if exists "patient_documents_pair_delete" on storage.objects;
create policy "patient_documents_pair_delete" on storage.objects
  for delete using (
    bucket_id = 'patient-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Ampliación de datos del perfil de terapeuta (bloque "gratis + mediano" del
-- rediseño de perfil pedido en el Notion "Sugerencias para perfil del
-- terapeuta"). No migra datos de client_niches/languages porque solo hay 3
-- cuentas de prueba (equipo de Lemy) y ya se validó con Gustavo que no hace
-- falta preservar esos valores.

alter table public.therapists
  add column if not exists therapy_types text[] default array[]::text[],  -- individual | pareja | familiar | grupal
  add column if not exists profession text,
  add column if not exists professional_license_number text,  -- número de cédula autoreportado; NO es la verificación de documentos (eso es therapist_credentials)
  add column if not exists university text,
  add column if not exists graduation_year int,
  add column if not exists country text not null default 'México',
  add column if not exists state text,
  add column if not exists birth_date date;  -- privado: solo validación interna, nunca se expone en el perfil público

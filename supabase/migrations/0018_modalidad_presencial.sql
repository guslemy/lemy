-- Modalidad presencial como opción real (antes solo existía is_online_available,
-- tratado como "si no es online, es presencial" — falso: un terapeuta puede
-- ofrecer ambas, una sola, o (temporalmente) ninguna).

alter table therapists
  add column if not exists is_in_person_available boolean not null default false,
  add column if not exists address text; -- dirección completa del consultorio, solo se revela tras reservar

-- Snapshot de la dirección al momento de confirmar la cita presencial — si el
-- terapeuta cambia su dirección después, las citas ya confirmadas conservan
-- la dirección correcta con la que se agendaron.
alter table appointments
  add column if not exists location_address text;

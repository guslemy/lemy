-- Antes, si la consulta a Google Calendar freeBusy fallaba por falta del
-- scope calendar.freebusy (terapeutas que conectaron su cuenta antes de que
-- se pidiera ese permiso — ver google-login-button.tsx), el error se
-- atrapaba en silencio y Lemy seguía mostrando "✓ Conectado" sin que nadie
-- se enterara de que en realidad no estaba leyendo el calendario real del
-- terapeuta para nada — causa confirmada de citas que se sobreponen con
-- eventos que el terapeuta ya tenía en Google.
--
-- Este campo se pone en `false` la primera vez que esa consulta específica
-- falla por permisos insuficientes (no por cualquier error transitorio de
-- red), y se limpia de vuelta a `true` en cuanto una consulta sí funciona —
-- ver src/lib/google-freebusy.ts.
alter table public.therapists
  add column if not exists google_calendar_freebusy_ok boolean not null default true;

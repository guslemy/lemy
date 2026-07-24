-- Los nombres técnicos de los enfoques venían con envoltura clínica extra
-- ("Terapia X", "(TCC)", "Psicoanálisis / Psicodinámica"). El terapeuta ya
-- sabe a qué se dedica — en su propio perfil (dashboard/perfil) mostramos
-- este campo tal cual, así que lo dejamos como la palabra exacta y corta
-- que un terapeuta reconoce de inmediato. La descripción en lenguaje llano
-- (descripcion_coloquial) sigue igual, para cuando se muestra al paciente.

update public.therapeutic_approaches set nombre_tecnico = 'Cognitivo-conductual' where slug = 'cognitivo-conductual';
update public.therapeutic_approaches set nombre_tecnico = 'Gestalt' where slug = 'gestalt';
update public.therapeutic_approaches set nombre_tecnico = 'Psicodinámico' where slug = 'psicodinamica';
update public.therapeutic_approaches set nombre_tecnico = 'Sistémico' where slug = 'sistemica';
update public.therapeutic_approaches set nombre_tecnico = 'Humanista' where slug = 'humanista';
update public.therapeutic_approaches set nombre_tecnico = 'EMDR' where slug = 'emdr';

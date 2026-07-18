-- Notificaciones dentro del dashboard: reutilizamos notification_log (ya
-- existía para deduplicar envíos del cron, solo la leía el service role)
-- como fuente de una bandeja de entrada simple dentro de la app. Cada
-- quien puede leer y marcar como leídas sus propias notificaciones — nadie
-- más, y nadie puede insertar filas falsas (sigue sin política de insert
-- para usuarios normales, solo el service role escribe).
alter table public.notification_log add column if not exists read_at timestamptz;

create policy "notification_log_recipient_read" on public.notification_log for select using (auth.uid() = recipient_id);
create policy "notification_log_recipient_update" on public.notification_log for update using (auth.uid() = recipient_id);

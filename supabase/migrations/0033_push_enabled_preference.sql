-- Preferencia de notificaciones push a nivel cuenta (no por dispositivo).
-- Antes de esto, "activar/desactivar" push solo existía implícitamente vía
-- el permiso del navegador (una fila por dispositivo en push_subscriptions,
-- ver 0032_push_subscriptions.sql) — no había forma de apagarlas para
-- siempre, en todos los dispositivos, sin ir uno por uno revocando el
-- permiso desde los ajustes del navegador/celular. Este campo es ese
-- interruptor único: sendPushToUser() lo revisa antes de mandar nada, sin
-- importar cuántas suscripciones activas tenga el usuario.
alter table public.profiles
  add column if not exists push_enabled boolean not null default true;

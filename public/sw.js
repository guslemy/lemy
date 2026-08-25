// Service worker mínimo, solo para Web Push (no cachea nada — Lemy no
// necesita funcionar offline, esto es puramente lo que exige el navegador
// para poder recibir push y mostrar la notificación del sistema).
self.addEventListener("push", (event) => {
  let data = { title: "Lemy", body: "Tienes una notificación nueva." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // payload no era JSON — se queda el genérico de arriba
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

// Al tocar la notificación: si Lemy ya está abierto en una pestaña, la
// enfoca en vez de abrir una nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

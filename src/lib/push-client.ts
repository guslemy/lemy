// Utilidades del lado del navegador para suscribirse a Web Push. Solo se
// importan desde componentes "use client" — usan APIs que no existen en el
// servidor (ServiceWorkerContainer, PushManager, Notification).

// El navegador exige la llave VAPID pública como Uint8Array, no como el
// base64url que genera web-push — conversión estándar, no hay atajo.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error -- propiedad no estándar, solo existe en Safari/iOS
    window.navigator.standalone === true
  );
}

export function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "error" };

// Registra el service worker (si falta), pide permiso, y crea la
// suscripción push — el objeto resultante (endpoint + llaves) se manda al
// servidor via el callback `save` para guardarlo en push_subscriptions.
export async function subscribeToPush(
  save: (sub: { endpoint: string; p256dh: string; auth: string }) => Promise<unknown>
): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { ok: false, reason: "error" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // TS más nuevo distingue ArrayBuffer de ArrayBufferLike de forma
        // más estricta de lo que el propio lib.dom.d.ts espera aquí — en
        // tiempo de ejecución un Uint8Array normal siempre ha funcionado.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: "error" };
    }

    await save({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
    return { ok: true };
  } catch (err) {
    console.error("Error suscribiendo a push:", err);
    return { ok: false, reason: "error" };
  }
}

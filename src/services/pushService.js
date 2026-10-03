const VAPID_PUBLIC_KEY = 'BOp27UIBW58VaFiys4g6ZRriVYdTncjzYRUgst5kIAh-o54ufVQ1M_HjZj8vgzhgqvfdu9WgEc-eaSNl-g-Sm30';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerPush(dosenName) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const existing = await reg.pushManager.getSubscription();
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await fetch('/api/subscribe-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dosen_name: dosenName, subscription: sub.toJSON() }),
    });

    return sub;
  } catch (err) {
    console.warn('Push registration failed:', err);
    return null;
  }
}

export async function unregisterPush() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/subscribe-push', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch {}
}

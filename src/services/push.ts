import { Capacitor } from '@capacitor/core';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Registro de push (FCM) para avisar o profissional de novos pedidos.
 * - Web: firebase/messaging + service worker (precisa de VITE_FIREBASE_VAPID_KEY).
 * - Nativo (Android/Capacitor): @capacitor/push-notifications (precisa de google-services.json).
 * Tudo é best-effort: qualquer falha só desliga o push, nunca quebra o app.
 */

const swConfig: Record<string, string> = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function pushSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    !!import.meta.env.VITE_FIREBASE_VAPID_KEY
  );
}

export function pushPermission(): PushPermission {
  if (Capacitor.isNativePlatform()) return 'default';
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as PushPermission;
}

async function saveToken(userId: string, token: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    fcmTokens: arrayUnion(token),
    fcmUpdatedAt: Date.now(),
  });
}

export async function removeToken(userId: string, token: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), { fcmTokens: arrayRemove(token) });
  } catch {
    /* noop */
  }
}

async function registerNative(userId: string): Promise<string | null> {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return null;

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const handles: Array<{ remove: () => void }> = [];
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      handles.forEach((h) => {
        try {
          h.remove();
        } catch {
          /* noop */
        }
      });
      resolve(token);
    };

    PushNotifications.addListener('registration', (t) => {
      saveToken(userId, t.value).catch(() => undefined);
      finish(t.value);
    }).then((h) => handles.push(h));

    PushNotifications.addListener('registrationError', () => finish(null)).then((h) => handles.push(h));

    PushNotifications.register().catch(() => finish(null));
    // rede lenta / sem Play Services: não trava a UI
    setTimeout(() => finish(null), 15000);
  });
}

async function registerWeb(userId: string): Promise<string | null> {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey || !swConfig.projectId) return null;

  const { isSupported, getMessaging, getToken } = await import('firebase/messaging');
  if (!(await isSupported())) return null;

  if (Notification.permission === 'default') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') return null;
  } else if (Notification.permission !== 'granted') {
    return null;
  }

  const qs = new URLSearchParams(swConfig).toString();
  const swReg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${qs}`);

  const messaging = getMessaging();
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
  if (token) await saveToken(userId, token);
  return token || null;
}

/** Pede permissão (se necessário) e registra o token. Retorna o token ou null. */
export async function registerForPush(userId: string): Promise<string | null> {
  try {
    if (!userId) return null;
    if (Capacitor.isNativePlatform()) return await registerNative(userId);
    if (!pushSupported()) return null;
    return await registerWeb(userId);
  } catch (err) {
    console.warn('registerForPush falhou:', err);
    return null;
  }
}

/** Best-effort sem incomodar: só garante o token se a permissão já foi concedida antes. */
export async function ensurePushIfGranted(userId: string): Promise<void> {
  try {
    if (!userId) return;
    if (Capacitor.isNativePlatform() || pushPermission() === 'granted') {
      await registerForPush(userId);
    }
  } catch {
    /* noop */
  }
}

/** Escuta mensagens com o app em primeiro plano. Devolve uma função de cleanup. */
export async function onForegroundPush(
  cb: (msg: { title?: string; body?: string; data?: Record<string, unknown> }) => void
): Promise<() => void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const h = await PushNotifications.addListener('pushNotificationReceived', (n) => {
        cb({ title: n.title, body: n.body, data: n.data });
      });
      return () => {
        try {
          h.remove();
        } catch {
          /* noop */
        }
      };
    }
    const { isSupported, getMessaging, onMessage } = await import('firebase/messaging');
    if (!(await isSupported())) return () => undefined;
    const unsub = onMessage(getMessaging(), (payload) => {
      cb({
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data,
      });
    });
    return unsub;
  } catch {
    return () => undefined;
  }
}

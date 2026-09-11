/* Service Worker do Firebase Cloud Messaging (Web Push).
 *
 * A config do Firebase é passada na querystring do registro (ver src/services/push.ts):
 *   navigator.serviceWorker.register('/firebase-messaging-sw.js?apiKey=...&projectId=...')
 * Assim não precisamos gerar este arquivo no build nem versionar chaves aqui.
 */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

const params = new URL(self.location).searchParams;
const firebaseConfig = {
  apiKey: params.get('apiKey') || undefined,
  authDomain: params.get('authDomain') || undefined,
  projectId: params.get('projectId') || undefined,
  storageBucket: params.get('storageBucket') || undefined,
  messagingSenderId: params.get('messagingSenderId') || undefined,
  appId: params.get('appId') || undefined,
};

try {
  if (firebaseConfig.projectId && firebaseConfig.messagingSenderId) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = (payload.notification && payload.notification.title) || 'Novo pedido';
      const body =
        (payload.notification && payload.notification.body) ||
        'Um novo pedido de serviço combina com o seu perfil.';
      const data = payload.data || {};
      self.registration.showNotification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: data.requestId ? `lead-${data.requestId}` : 'lead',
        data,
      });
    });
  }
} catch (err) {
  // Registro sem config válida — SW fica inerte.
  console.warn('[firebase-messaging-sw] init falhou:', err);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestId = event.notification.data && event.notification.data.requestId;
  const path = requestId ? `/requests/${requestId}` : '/proposals';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.navigate(path);
          return w.focus();
        }
      }
      return clients.openWindow(path);
    })
  );
});

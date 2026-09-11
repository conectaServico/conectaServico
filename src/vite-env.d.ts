/// <reference types="vite/client" />
// NOTE: `/// <reference types="vite-plugin-pwa/client" />` is added in the PWA milestone,
// once vite-plugin-pwa is installed, to type the `virtual:pwa-register` module.

interface ImportMetaEnv {
  // Firebase Web SDK config
  // (Firebase console -> Project settings -> General -> Your apps -> SDK setup and configuration)
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;

  // Firebase App Check - reCAPTCHA v3 site key (web attestation)
  readonly VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY: string;

  // Firebase Cloud Messaging - chave VAPID (Web Push).
  // Console -> Project settings -> Cloud Messaging -> Web Push certificates -> Key pair.
  // Sem ela, o push no navegador fica desligado (o app nativo Android não precisa dela).
  readonly VITE_FIREBASE_VAPID_KEY: string;

  // Mercado Pago - PUBLIC (publishable) key for the client-side checkout SDK
  readonly VITE_MP_PUBLIC_KEY: string;

  // Connect the client to the local Firebase emulators when '1'
  readonly VITE_USE_EMULATORS: string;

  // Where face-api.js loads its model weights from (defaults to '/models')
  readonly VITE_FACEAPI_MODEL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';

// Precisa bater com a região das Cloud Functions (functions/src/index.ts)
export const FUNCTIONS_REGION = 'southamerica-east1';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// App Check (proteção contra abuso). Opcional: só liga se a site key do reCAPTCHA v3 estiver definida.
// Configure o enforcement no console (Firestore / Functions / Storage) depois de validar em produção.
if (app && import.meta.env.VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY) {
  // Em dev com emuladores, libera o token de debug (registre-o no console -> App Check -> Apps).
  if (import.meta.env.DEV && ['1', 'true'].includes(import.meta.env.VITE_USE_EMULATORS)) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = (app ? getAuth(app) : null) as Auth;
export const db = (app ? getFirestore(app) : null) as Firestore;
export const storage = (app ? getStorage(app) : null) as FirebaseStorage;
export const functions = (app ? getFunctions(app, FUNCTIONS_REGION) : null) as Functions;

if (app && functions && ['1', 'true'].includes(import.meta.env.VITE_USE_EMULATORS)) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default app;

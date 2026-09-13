import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';

/**
 * Registra um erro do front-end em `errorLogs` (Firestore) pra aparecer no
 * painel admin — a única visibilidade que existe hoje pra erros que acontecem
 * no navegador do usuário (erros de servidor já vão pro Cloud Logging
 * automaticamente). Best-effort: nunca lança, nunca trava a UI.
 */
export function logClientError(message: string, extra?: { stack?: string; source?: string }): void {
  try {
    const user = useUserStore.getState().user;
    addDoc(collection(db, 'errorLogs'), {
      source: 'client',
      message: String(message).slice(0, 2000),
      stack: (extra?.stack || '').slice(0, 4000),
      origin: extra?.source || 'unknown',
      path: window.location.pathname,
      userId: user?.id || null,
      userRole: user?.role || null,
      userAgent: navigator.userAgent,
      created_at: Date.now(),
    }).catch(() => {
      // Sem sorte (ex.: usuário deslogado, regra não bate) — não insiste, não trava nada.
    });
  } catch {
    // Nunca deixa o log de erro virar outro erro.
  }
}

let installed = false;

/** Instala os handlers globais uma única vez (erros fora da árvore do React). */
export function installGlobalErrorLogging(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    logClientError(event.message || 'Erro desconhecido', {
      stack: event.error?.stack,
      source: 'window.onerror',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    logClientError(message, {
      stack: reason instanceof Error ? reason.stack : undefined,
      source: 'unhandledrejection',
    });
  });
}

import { Capacitor } from '@capacitor/core';
import type { Audience } from '@/store/audienceStore';

/**
 * Definido em build-time (VITE_APP_AUDIENCE=client|professional, ver
 * .env.client / .env.professional) — trava qual "lado" do app cada APK
 * nativo mostra. Ausente = build web normal (site completo, com toggle
 * cliente/profissional).
 */
export const LOCKED_AUDIENCE: Audience | null =
  (import.meta.env.VITE_APP_AUDIENCE as Audience | undefined) === 'professional'
    ? 'professional'
    : (import.meta.env.VITE_APP_AUDIENCE as Audience | undefined) === 'client'
      ? 'client'
      : null;

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

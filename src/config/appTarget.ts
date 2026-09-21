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

/**
 * App Android do profissional: as compras de diamantes vão pelo Google Play Billing (regra da
 * loja: moeda virtual comprada dentro do app), com preço +20% pra cobrir a taxa da Google.
 * No site e no app do cliente continua o Mercado Pago / nada é vendido.
 */
export const isPlayBillingApp = (): boolean =>
  LOCKED_AUDIENCE === 'professional' && Capacitor.getPlatform() === 'android';

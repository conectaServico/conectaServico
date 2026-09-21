/**
 * Ciclo de vida do pedido (espelha functions/src/index.ts: REQUEST_EXPIRY_DAYS e MAX_UNLOCKS).
 * - Todo pedido sai do ar 3 dias depois de criado, mesmo que o cliente já tenha escolhido um profissional
 *   (aberto sem ninguém escolhido -> expirado; com profissional escolhido -> concluído sozinho).
 * - No máximo 3 profissionais por pedido: ao entrar o 3º, o pedido fica "completo" e some do feed dos outros.
 */
export const REQUEST_LIFETIME_DAYS = 3;
export const MAX_PROS_PER_REQUEST = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Quando o pedido sai do ar (ms). */
export const requestExpiresAt = (createdAt: number): number => createdAt + REQUEST_LIFETIME_DAYS * DAY_MS;

/** O pedido já tem os 3 profissionais? */
export const isRequestFull = (unlockCount?: number): boolean => (unlockCount || 0) >= MAX_PROS_PER_REQUEST;

/** "3 dias", "1 dia e 4 h", "5 h", "menos de 1 h" — quanto falta pro pedido sair do ar. */
export function timeLeftLabel(createdAt: number, now: number = Date.now()): string {
  const left = requestExpiresAt(createdAt) - now;
  if (left <= 0) return 'encerrando';
  const days = Math.floor(left / DAY_MS);
  const hours = Math.floor((left % DAY_MS) / (60 * 60 * 1000));
  if (days > 0) return hours > 0 ? `${days} ${days === 1 ? 'dia' : 'dias'} e ${hours} h` : `${days} ${days === 1 ? 'dia' : 'dias'}`;
  return hours > 0 ? `${hours} h` : 'menos de 1 h';
}

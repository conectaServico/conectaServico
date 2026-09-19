/**
 * Custo (em diamantes) de desbloquear um pedido: base × faixa de metragem (m²) ×
 * faixa de região (UF), arredondado e limitado. O app só MOSTRA esse valor —
 * quem cobra é a Function `unlockContact`, que faz a mesma conta e recusa se o
 * número que o app viu for diferente.
 *
 * IMPORTANTE: manter idêntico à `unlockCostFor` de functions/src/index.ts.
 * Pedido sem metragem (categorias que não perguntam m²) paga só o multiplicador
 * de região; sem UF, paga o valor base.
 */
export const UNLOCK_BASE_COST = 10;
const UNLOCK_MIN_COST = 5;
const UNLOCK_MAX_COST = 60;

const AREA_TIERS: Array<{ upToM2: number; mult: number }> = [
  { upToM2: 30, mult: 1 },
  { upToM2: 80, mult: 1.5 },
  { upToM2: 150, mult: 2 },
  { upToM2: 300, mult: 3 },
  { upToM2: Infinity, mult: 4 },
];
const UF_HIGH = ['SP', 'RJ', 'DF']; // ×1,3
const UF_LOW = ['AC', 'AP', 'AM', 'RR', 'RO', 'TO', 'PA', 'MA', 'PI', 'AL', 'SE', 'PB', 'RN']; // ×0,8

export function unlockCostFor(r: { areaSize?: unknown; uf?: unknown; state?: unknown }): number {
  const area = parseFloat(String(r.areaSize ?? '').replace(',', '.'));
  const areaMult = area > 0 ? AREA_TIERS.find((t) => area <= t.upToM2)!.mult : 1;
  const uf = String(r.uf || r.state || '').toUpperCase();
  const regionMult = UF_HIGH.includes(uf) ? 1.3 : UF_LOW.includes(uf) ? 0.8 : 1;
  return Math.min(UNLOCK_MAX_COST, Math.max(UNLOCK_MIN_COST, Math.round(UNLOCK_BASE_COST * areaMult * regionMult)));
}

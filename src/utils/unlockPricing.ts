/**
 * Custo (em diamantes) de desbloquear um pedido: base × faixa de metragem (m²) ×
 * multiplicador de região, arredondado e limitado (5 a 60). O app só MOSTRA esse
 * valor — quem cobra é a Function `unlockContact`, que faz a mesma conta e recusa
 * se o número que o app viu for diferente.
 *
 * IMPORTANTE: manter idêntico à `unlockCostFor` de functions/src/index.ts.
 *
 * Região: na cidade de São Paulo o valor sobe quanto mais perto do centro (raio
 * a partir da Praça da Sé) e nos bairros nobres; no resto do país vale a tabela
 * por UF. Pedido sem metragem (categorias que não perguntam m²) paga só a região.
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

// Capital paulista: anéis a partir do centro (Praça da Sé) + piso pros bairros nobres.
const SP_CENTER = { lat: -23.5505, lng: -46.6333 };
const SP_RINGS: Array<{ upToKm: number; mult: number }> = [
  { upToKm: 3, mult: 1.8 },
  { upToKm: 6, mult: 1.6 },
  { upToKm: 10, mult: 1.45 },
  { upToKm: Infinity, mult: 1.3 },
];
const SP_NOBRE_MULT = 1.8;
// Nomes normalizados (sem acento, minúsculos), comparação exata com o bairro do pedido.
const SP_NOBRE = new Set([
  'jardim paulista', 'jardim america', 'jardim europa', 'jardim paulistano', 'jardim guedala',
  'itaim bibi', 'vila nova conceicao', 'moema', 'indianopolis', 'planalto paulista', 'vila uberabinha',
  'pinheiros', 'alto de pinheiros', 'vila madalena', 'vila olimpia', 'higienopolis', 'cerqueira cesar',
  'consolacao', 'paraiso', 'brooklin', 'brooklin paulista', 'brooklin novo', 'campo belo', 'morumbi',
  'cidade jardim', 'pacaembu', 'sumare', 'perdizes', 'chacara santo antonio', 'real parque', 'panamby',
]);

const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export interface UnlockPricingInput {
  areaSize?: unknown;
  uf?: unknown;
  state?: unknown;
  city?: unknown;
  cityKey?: unknown;
  neighborhood?: unknown;
  lat?: unknown;
  lng?: unknown;
  geoPrecise?: unknown;
}

function regionMult(r: UnlockPricingInput): number {
  const uf = String(r.uf || r.state || '').toUpperCase();
  const city = norm(r.cityKey || r.city);

  if (uf === 'SP' && city === 'sao paulo') {
    // Coordenada só vale se veio do CEP (geoPrecise); senão é o centroide do estado.
    let m = SP_RINGS[SP_RINGS.length - 1].mult;
    if (r.geoPrecise === true && typeof r.lat === 'number' && typeof r.lng === 'number') {
      const d = kmBetween(SP_CENTER, { lat: r.lat, lng: r.lng });
      m = SP_RINGS.find((ring) => d <= ring.upToKm)!.mult;
    }
    if (SP_NOBRE.has(norm(r.neighborhood))) m = Math.max(m, SP_NOBRE_MULT);
    return m;
  }

  return UF_HIGH.includes(uf) ? 1.3 : UF_LOW.includes(uf) ? 0.8 : 1;
}

export function unlockCostFor(r: UnlockPricingInput): number {
  const area = parseFloat(String(r.areaSize ?? '').replace(',', '.'));
  const areaMult = area > 0 ? AREA_TIERS.find((t) => area <= t.upToM2)!.mult : 1;
  return Math.min(UNLOCK_MAX_COST, Math.max(UNLOCK_MIN_COST, Math.round(UNLOCK_BASE_COST * areaMult * regionMult(r))));
}

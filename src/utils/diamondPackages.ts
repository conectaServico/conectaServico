/**
 * Pacotes de diamantes. O servidor é quem manda: `DIAMOND_PACKAGES` (Mercado Pago, site) e
 * `PLAY_PRODUCTS` (Google Play, app Android) em functions/src/index.ts — aqui só o que a tela mostra.
 */
export interface DiamondPackage {
  id: string;
  diamonds: number;
  price: number;
  popular: boolean;
}

/** Preços do site (Mercado Pago). */
export const DIAMOND_PACKAGES: DiamondPackage[] = [
  { id: 'pkg_50', diamonds: 50, price: 9.9, popular: false },
  { id: 'pkg_150', diamonds: 150, price: 27.9, popular: true },
  { id: 'pkg_300', diamonds: 300, price: 49.9, popular: false },
];

/**
 * Preços no app Android (Google Play): site + 20% (cobre a taxa da Google), arredondado pra cima.
 * Precisam ser iguais aos preços dos produtos criados na Play Console e ao PLAY_PRODUCTS do servidor.
 */
export const APP_PRICES: Record<string, number> = {
  pkg_50: 11.9, // 9,90 × 1,2 = 11,88
  pkg_150: 33.9, // 27,90 × 1,2 = 33,48
  pkg_300: 59.9, // 49,90 × 1,2 = 59,88
};

/** Pacotes já com o preço certo pro canal (app usa APP_PRICES). */
export const packagesFor = (playBilling: boolean): DiamondPackage[] =>
  DIAMOND_PACKAGES.map((p) => (playBilling ? { ...p, price: APP_PRICES[p.id] ?? p.price } : p));

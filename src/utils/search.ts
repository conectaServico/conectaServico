/**
 * Tokens de busca para o Firestore (MVP — sem Algolia/Typesense).
 * Gera palavras normalizadas (sem acento, minúsculas) a partir de nome, serviços,
 * cidade e descrição. A query usa `array-contains-any` sobre `searchTokens` e
 * a relevância é o nº de tokens que casam, ordenado no cliente.
 *
 * Limitações conhecidas: sem tolerância a erro de digitação e sem ranking real.
 * Upgrade futuro: indexar `publicProfiles`/`serviceRequests` no Algolia.
 */

const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'para', 'por', 'com',
  'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'que', 'ou', 'the', 'of',
]);

/** Minúsculas e sem acento — usado tanto pros tokens do Firestore quanto por filtros locais simples (ex.: busca de serviço no formulário de pedido). */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Quebra textos livres em palavras normalizadas (>=2 chars, sem stopwords). */
export function tokenize(input: string | string[]): string[] {
  const text = Array.isArray(input) ? input.join(' ') : input;
  const words = normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  return Array.from(new Set(words));
}

/**
 * Tokens para gravar num doc. Inclui as palavras inteiras e, para termos com 4+
 * letras, prefixos a partir de 3 chars (ajuda buscas parciais tipo "eletri").
 * Limitado a 60 entradas para não estourar o índice do Firestore.
 */
export function buildSearchTokens(parts: Array<string | undefined | null>): string[] {
  const base = tokenize(parts.filter(Boolean).join(' '));
  const out = new Set<string>(base);
  for (const w of base) {
    for (let n = 3; n < w.length && n <= 8; n++) out.add(w.slice(0, n));
  }
  return Array.from(out).slice(0, 60);
}

/** Tokens da busca do usuário (sem prefixos — o doc já guardou os prefixos dele). */
export function queryTokens(q: string): string[] {
  return tokenize(q).slice(0, 10);
}

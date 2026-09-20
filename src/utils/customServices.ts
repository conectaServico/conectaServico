/**
 * "Outros serviços": o profissional escreve, com as próprias palavras, o que faz
 * além da lista fixa de categorias (ex.: "Instalação de portão eletrônico").
 * Não entram no casamento automático de pedidos (esse usa as categorias) — servem
 * pro perfil público e pra busca. A Cloud Function `syncPublicProfile` repete essas
 * mesmas regras no servidor (limites abaixo).
 */
export const MAX_CUSTOM_SERVICES = 10;
export const MIN_CUSTOM_SERVICE_LENGTH = 3;
export const MAX_CUSTOM_SERVICE_LENGTH = 60;

export const normalizeCustomService = (raw: string): string =>
  raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CUSTOM_SERVICE_LENGTH);

/** Limpa uma lista vinda do banco/formulário: só textos, sem repetidos, dentro dos limites. */
export function cleanCustomServices(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const s = normalizeCustomService(item);
    const key = s.toLowerCase();
    if (s.length < MIN_CUSTOM_SERVICE_LENGTH || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= MAX_CUSTOM_SERVICES) break;
  }
  return out;
}

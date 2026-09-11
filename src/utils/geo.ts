import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';

export { geohashQueryBounds, distanceBetween };

export type LatLng = { lat: number; lng: number };

/**
 * Centroides aproximados por UF (coordenadas da capital). Usados como fallback
 * quando o CEP não resolve coordenadas — assim todo pedido/profissional tem ao
 * menos um ponto para o geohash, degradando para precisão estadual.
 */
const UF_CENTROIDS: Record<string, [number, number]> = {
  AC: [-9.97, -67.81], AL: [-9.67, -35.74], AP: [0.03, -51.07], AM: [-3.12, -60.02],
  BA: [-12.97, -38.51], CE: [-3.73, -38.53], DF: [-15.79, -47.88], ES: [-20.32, -40.34],
  GO: [-16.68, -49.25], MA: [-2.53, -44.30], MT: [-15.6, -56.1], MS: [-20.44, -54.65],
  MG: [-19.92, -43.94], PA: [-1.46, -48.5], PB: [-7.12, -34.88], PR: [-25.43, -49.27],
  PE: [-8.05, -34.9], PI: [-5.09, -42.8], RJ: [-22.91, -43.2], RN: [-5.79, -35.21],
  RS: [-30.03, -51.23], RO: [-8.76, -63.9], RR: [2.82, -60.67], SC: [-27.59, -48.55],
  SP: [-23.55, -46.63], SE: [-10.95, -37.07], TO: [-10.18, -48.33],
};

export function normalizeUf(uf?: string | null): string {
  return (uf || '').trim().toUpperCase().slice(0, 2);
}

/** cidade sem acento, minúscula, sem espaços duplicados — chave de comparação estável. */
export function normalizeCity(city?: string | null): string {
  return (city || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function geohashFor(lat: number, lng: number): string {
  return geohashForLocation([lat, lng]);
}

/**
 * BrasilAPI CEP v2 devolve `location.coordinates` quando o provedor subjacente tem
 * a informação. É público, com CORS e sem chave. Retorna null se não houver coords.
 */
export async function geocodeCep(cep: string): Promise<LatLng | null> {
  const clean = (cep || '').replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const resp = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const c = data?.location?.coordinates;
    const lat = Number(c?.latitude);
    const lng = Number(c?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Nominatim (OpenStreetMap) — geocodifica por CEP ou por endereço. Grátis, sem chave.
 * Política de uso: no máx. 1 req/s e um Referer/User-Agent válido (o navegador manda
 * o Referer automaticamente). Usado só em save de perfil / criação de pedido (baixo volume).
 */
export async function geocodeNominatim(opts: {
  cep?: string;
  street?: string;
  city?: string;
  uf?: string;
}): Promise<LatLng | null> {
  const params = new URLSearchParams({ format: 'json', limit: '1', countrycodes: 'br' });
  const cep = (opts.cep || '').replace(/\D/g, '');
  if (cep.length === 8) {
    params.set('postalcode', cep);
  } else if (opts.city) {
    if (opts.street) params.set('street', opts.street);
    params.set('city', opts.city);
    if (opts.uf) params.set('state', opts.uf);
  } else {
    return null;
  }
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;
    const arr = (await resp.json()) as Array<{ lat: string; lon: string }>;
    const hit = arr?.[0];
    const lat = Number(hit?.lat);
    const lng = Number(hit?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

/** CEP (BrasilAPI) → CEP/endereço (Nominatim) → centroide da UF → null. */
export async function resolveLatLng(
  cep: string | undefined | null,
  uf: string | undefined | null,
  extra?: { street?: string; city?: string }
): Promise<{ lat: number; lng: number; precise: boolean } | null> {
  if (cep) {
    const byCep = await geocodeCep(cep);
    if (byCep) return { ...byCep, precise: true };
  }
  const byOsm = await geocodeNominatim({
    cep: cep || undefined,
    street: extra?.street,
    city: extra?.city,
    uf: normalizeUf(uf) || undefined,
  });
  if (byOsm) return { ...byOsm, precise: true };

  const centroid = UF_CENTROIDS[normalizeUf(uf)];
  if (centroid) return { lat: centroid[0], lng: centroid[1], precise: false };
  return null;
}

/**
 * Monta os campos de localização normalizada para gravar num doc de user ou
 * serviceRequest. Nunca devolve `undefined` (Firestore rejeita) — campos ausentes
 * simplesmente não entram no objeto. Seguro para espalhar: `{ ...await buildGeoFields(...) }`.
 */
export async function buildGeoFields(opts: {
  cep?: string;
  uf?: string;
  city?: string;
  street?: string;
}): Promise<Record<string, string | number | boolean>> {
  const out: Record<string, string | number | boolean> = {};
  const uf = normalizeUf(opts.uf);
  const cityKey = normalizeCity(opts.city);
  if (uf) out.uf = uf;
  if (cityKey) out.cityKey = cityKey;

  const point = await resolveLatLng(opts.cep, uf, { street: opts.street, city: opts.city });
  if (point) {
    out.lat = point.lat;
    out.lng = point.lng;
    out.geohash = geohashFor(point.lat, point.lng);
    out.geoPrecise = point.precise;
  }
  return out;
}

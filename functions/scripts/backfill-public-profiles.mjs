/**
 * Backfill único: gera `publicProfiles/*` a partir dos `users/*` já existentes.
 * A Function syncPublicProfile cuida dos novos/alterados daqui pra frente.
 *
 * Uso (dentro da pasta functions/):
 *   node scripts/backfill-public-profiles.mjs
 *
 * Pré-requisito: functions/serviceAccountKey.json (mesma chave do set-admin.mjs).
 */
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const keyPath = join(here, '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch {
  console.error(`Não encontrei ${keyPath}. Baixe a chave de serviço e salve nesse caminho.`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const FIELDS = [
  'name',
  'role',
  'photo_url',
  'city',
  'state',
  'uf',
  'bio',
  'services',
  'serviceCategories',
  'rating',
  'reviewCount',
  'verified',
  'created_at',
];

const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'para', 'por', 'com',
  'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'que', 'ou', 'the', 'of',
]);

// Mesmos tokens que a Function syncPublicProfile / src/utils/search.ts geram.
function buildSearchTokens(parts) {
  const text = parts
    .filter((p) => typeof p === 'string' || Array.isArray(p))
    .map((p) => (Array.isArray(p) ? p.join(' ') : p))
    .join(' ');
  const words = String(text)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  const out = new Set(words);
  for (const w of words) {
    for (let i = 3; i < w.length && i <= 8; i++) out.add(w.slice(0, i));
  }
  return Array.from(out).slice(0, 60);
}

const snap = await db.collection('users').get();
const writer = db.bulkWriter();
let n = 0;

snap.forEach((doc) => {
  const src = doc.data();
  const out = { id: doc.id };
  for (const k of FIELDS) if (src[k] !== undefined) out[k] = src[k];
  out.searchTokens = buildSearchTokens([
    src.name,
    src.services,
    src.serviceCategories,
    src.city,
    src.uf,
    src.bio,
  ]);
  writer.set(db.doc(`publicProfiles/${doc.id}`), out);
  n += 1;
});

await writer.close();
console.log(`OK: ${n} publicProfiles gravados.`);
process.exit(0);

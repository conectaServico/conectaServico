/**
 * Torna um usuário admin (custom claim `admin` + espelho `isAdmin` no doc).
 * Uso (dentro da pasta functions/):
 *
 *   node scripts/set-admin.mjs email@exemplo.com
 *
 * Pré-requisito: baixe a chave de serviço em
 *   Console Firebase -> Configurações do projeto -> Contas de serviço -> Gerar nova chave privada
 * e salve como  functions/serviceAccountKey.json  (já está no .gitignore).
 */
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const keyPath = join(here, '..', 'serviceAccountKey.json');

const email = process.argv[2];
if (!email) {
  console.error('Uso: node scripts/set-admin.mjs <email>');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch {
  console.error(`Não encontrei ${keyPath}. Baixe a chave de serviço e salve nesse caminho.`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const user = await admin.auth().getUserByEmail(email);
await admin.auth().setCustomUserClaims(user.uid, { admin: true });
await admin.firestore().doc(`users/${user.uid}`).set({ isAdmin: true }, { merge: true });

console.log(`OK: ${email} (${user.uid}) agora é admin.`);
console.log('Faça logout e login no app para o token pegar o claim.');
process.exit(0);

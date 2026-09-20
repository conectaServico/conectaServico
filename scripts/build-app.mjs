#!/usr/bin/env node
/**
 * Gera o app Android de um dos lados da plataforma.
 *
 *   node scripts/build-app.mjs <client|professional> <apk|aab> [debug|release]
 *
 * - apk (padrão debug): instala direto no celular/emulador.
 * - aab (sempre release): arquivo que vai pra Play Store. Precisa de android/keystore.properties.
 *
 * O front é gerado em dist-app/<lado> (não mexe na pasta dist do site) com
 * VITE_APP_AUDIENCE travando o app no lado escolhido, e o resultado final é
 * copiado pra dist-app/ com nome legível.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

const [audience, kind = 'apk', variantArg] = process.argv.slice(2);
if (!['client', 'professional'].includes(audience) || !['apk', 'aab'].includes(kind)) {
  console.error('Uso: node scripts/build-app.mjs <client|professional> <apk|aab> [debug|release]');
  process.exit(1);
}
const variant = kind === 'aab' ? 'release' : variantArg === 'release' ? 'release' : 'debug';

const flavor = audience; // nome do productFlavor no android/app/build.gradle
const Flavor = flavor[0].toUpperCase() + flavor.slice(1);
const Variant = variant[0].toUpperCase() + variant.slice(1);
const label = audience === 'client' ? 'cliente' : 'profissional';
const webDir = path.join('dist-app', audience);

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin,
    ...opts,
    env: { ...process.env, ...(opts.env || {}) },
  });
  if (r.status !== 0) {
    console.error(`\nFalhou: ${cmd} ${args.join(' ')}`);
    process.exit(r.status || 1);
  }
}

if (variant === 'release' && !existsSync(path.join(root, 'android', 'keystore.properties'))) {
  console.error('Falta android/keystore.properties (assinatura de release). Veja DEPLOY.md.');
  process.exit(1);
}

// 1) Front travado no lado escolhido, fora da pasta dist do site.
run('npx', ['tsc', '-b']);
run('npx', ['vite', 'build', '--outDir', webDir, '--emptyOutDir'], {
  env: { VITE_APP_AUDIENCE: audience },
});

// 2) Copia o front pro projeto Android com o appId/nome certos.
run('npx', ['cap', 'sync', 'android'], { env: { APP_AUDIENCE: audience, APP_WEB_DIR: webDir } });

// 3) Gradle.
const task = `${kind === 'aab' ? 'bundle' : 'assemble'}${Flavor}${Variant}`;
const androidDir = path.join(root, 'android');
run(path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew'), [task], { cwd: androidDir });

// 4) Copia o resultado com nome legível.
const gradle = readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8');
const versionName = /versionName\s+"([^"]+)"/.exec(gradle)?.[1] ?? '0';
const versionCode = /versionCode\s+(\d+)/.exec(gradle)?.[1] ?? '0';
const out = path.join(root, 'android', 'app', 'build', 'outputs');
const built =
  kind === 'aab'
    ? path.join(out, 'bundle', `${flavor}${Variant}`, `app-${flavor}-${variant}.aab`)
    : path.join(out, 'apk', flavor, variant, `app-${flavor}-${variant}.apk`);
if (!existsSync(built)) {
  console.error(`Não achei o arquivo gerado em ${built}`);
  process.exit(1);
}
mkdirSync(path.join(root, 'dist-app'), { recursive: true });
const dest = path.join(root, 'dist-app', `conecta-servico-${label}-${versionName}-b${versionCode}-${variant}.${kind}`);
copyFileSync(built, dest);
console.log(`\nPronto: ${path.relative(root, dest)}`);

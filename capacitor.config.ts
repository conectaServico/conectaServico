import type { CapacitorConfig } from '@capacitor/cli';

// Um app por lado (cliente / profissional). O scripts/build-app.mjs define
// APP_AUDIENCE e APP_WEB_DIR antes de chamar `cap sync`.
const audience = process.env.APP_AUDIENCE === 'client' ? 'client' : 'professional';

const config: CapacitorConfig = {
  appId: audience === 'client' ? 'com.conectaservico.app' : 'com.conectaservico.pro',
  appName: audience === 'client' ? 'Conecta Serviço Cliente' : 'Conecta Serviço Profissional',
  webDir: process.env.APP_WEB_DIR || 'dist',
};

export default config;

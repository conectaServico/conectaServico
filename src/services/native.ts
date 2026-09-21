import { Capacitor } from '@capacitor/core';

/**
 * Pequenos recursos do aparelho, só no app nativo (no site tudo isso é silencioso e não faz nada).
 * Sempre best-effort: falhou, segue a vida.
 */

/** Vibração curtinha de confirmação (toque em menu, compra concluída…). */
export async function hapticTap(kind: 'light' | 'success' = 'light'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (kind === 'success') await Haptics.notification({ type: NotificationType.Success });
    else await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* sem vibrador */
  }
}

/**
 * Botão "voltar" do Android: volta uma tela; na tela inicial pede um segundo toque pra sair
 * (sem isso, um toque sem querer fecha o app). Devolve a função pra remover o ouvinte.
 */
export async function installBackButton(opts: {
  /** Telas "raiz" (abas): voltar nelas leva pro início; no início pede o duplo toque pra sair. */
  isRoot: (path: string) => boolean;
  onExitHint: () => void;
  goHome: () => void;
}): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  try {
    const { App } = await import('@capacitor/app');
    let lastPress = 0;
    const handle = await App.addListener('backButton', ({ canGoBack }) => {
      const path = window.location.pathname;
      if (!opts.isRoot(path) && canGoBack) {
        window.history.back();
        return;
      }
      if (path !== '/' && path !== '/login') {
        opts.goHome(); // aba (Pedidos, Chat, Perfil…): volta pro início antes de sair do app
        return;
      }
      const now = Date.now();
      if (now - lastPress < 2000) {
        App.exitApp();
      } else {
        lastPress = now;
        opts.onExitHint();
      }
    });
    return () => {
      try {
        handle.remove();
      } catch {
        /* noop */
      }
    };
  } catch {
    return () => undefined;
  }
}

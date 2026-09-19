import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { sendPasswordResetFn } from '@/services/api';

/**
 * Manda o e-mail de "esqueci minha senha": tenta o nosso e-mail bonito (HTML, com
 * logo e botão, via servidor) e, se o servidor não estiver com o e-mail ligado ou
 * falhar, cai no e-mail padrão do Firebase — a pessoa nunca fica sem receber.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetFn({ email });
  } catch {
    await sendPasswordResetEmail(auth, email);
  }
}

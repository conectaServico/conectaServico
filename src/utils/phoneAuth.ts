import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from '@/services/firebase';

// Um RecaptchaVerifier por container — o Firebase não deixa recriar no mesmo elemento.
const verifiers = new Map<string, RecaptchaVerifier>();

export function getRecaptcha(containerId: string): RecaptchaVerifier {
  let v = verifiers.get(containerId);
  if (!v) {
    v = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    verifiers.set(containerId, v);
  }
  return v;
}

/** Limpa o verifier de um container (no erro de envio ou ao desmontar a tela). */
export function clearRecaptcha(containerId: string): void {
  const v = verifiers.get(containerId);
  if (v) {
    try {
      v.clear();
    } catch {
      /* ignore */
    }
    verifiers.delete(containerId);
  }
}

/**
 * Dispara o SMS de login/cadastro do profissional. `e164` já em +55DDDNXXXXXXXX
 * (use `toE164BR`). Devolve o ConfirmationResult — guarde e chame `.confirm(code)`.
 */
export async function sendOtp(e164: string, containerId: string): Promise<ConfirmationResult> {
  try {
    return await signInWithPhoneNumber(auth, e164, getRecaptcha(containerId));
  } catch (err) {
    clearRecaptcha(containerId);
    throw err;
  }
}

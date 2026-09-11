import { useUserStore } from '@/store/userStore';

/**
 * Estado de verificação da conta, vindo do Firebase Auth. `verified` = pode
 * executar ações sensíveis (publicar pedido, enviar proposta, desbloquear
 * contato, comprar diamantes). A trava real está nas regras do Firestore e
 * nas Cloud Functions; isto é só a camada de UX.
 *
 * Cliente: só precisa confirmar o e-mail (é a identidade dele). Celular fica
 * como contato opcional — obrigar os dois criaria conflito quando a mesma
 * pessoa já usa aquele número como login da conta de profissional.
 * Profissional: a conta é só telefone (SMS) — o próprio login já é a
 * verificação de contato.
 */
export function useVerified() {
  const emailVerified = useUserStore((s) => s.emailVerified);
  const phoneVerified = useUserStore((s) => s.phoneVerified);
  const signInProvider = useUserStore((s) => s.signInProvider);
  const isPhoneAccount = signInProvider === 'phone';
  return {
    emailVerified,
    phoneVerified,
    isPhoneAccount,
    verified: isPhoneAccount ? phoneVerified : emailVerified,
  };
}

/** Converte um telefone BR (com máscara) para E.164: +55DDDNXXXXXXXX. */
export function toE164BR(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
  return `+55${digits}`;
}

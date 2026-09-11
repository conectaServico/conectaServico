import { useUserStore } from '@/store/userStore';

/**
 * Estado de verificação da conta (e-mail + telefone), vindo do Firebase Auth.
 * `verified` = pode executar ações sensíveis (publicar pedido, enviar proposta,
 * desbloquear contato, comprar diamantes). A trava real está nas regras do
 * Firestore e nas Cloud Functions; isto é só a camada de UX.
 */
export function useVerified() {
  const emailVerified = useUserStore((s) => s.emailVerified);
  const phoneVerified = useUserStore((s) => s.phoneVerified);
  const signInProvider = useUserStore((s) => s.signInProvider);
  // Conta de profissional é só telefone (SMS) — o próprio login por SMS já é a
  // verificação de contato, então não passa pelo hub de e-mail.
  const isPhoneAccount = signInProvider === 'phone';
  return {
    emailVerified,
    phoneVerified,
    isPhoneAccount,
    verified: isPhoneAccount ? phoneVerified : emailVerified && phoneVerified,
  };
}

/** Converte um telefone BR (com máscara) para E.164: +55DDDNXXXXXXXX. */
export function toE164BR(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
  return `+55${digits}`;
}

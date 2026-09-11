import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Wrappers tipados das Cloud Functions (backend autoritativo).
 * Nada que envolva saldo, aceite, verificação ou transações é feito direto no cliente.
 */

export const unlockContactFn = httpsCallable<
  { requestId: string },
  {
    alreadyUnlocked: boolean;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    newBalance?: number;
  }
>(functions, 'unlockContact');

export const acceptProposalFn = httpsCallable<
  { requestId: string; proposalId: string },
  { ok: boolean }
>(functions, 'acceptProposal');

export const cancelRequestFn = httpsCallable<{ requestId: string }, { ok: boolean }>(
  functions,
  'cancelRequest'
);

export const reopenRequestFn = httpsCallable<{ requestId: string }, { ok: boolean }>(
  functions,
  'reopenRequest'
);

export const deleteRequestFn = httpsCallable<{ requestId: string }, { ok: boolean }>(
  functions,
  'deleteRequest'
);

export const startWorkFn = httpsCallable<{ requestId: string }, { ok: boolean }>(functions, 'startWork');
export const completeWorkFn = httpsCallable<{ requestId: string }, { ok: boolean }>(
  functions,
  'completeWork'
);

/** Chamada pela tela /verify quando e-mail + telefone estão confirmados (dispara o bônus de indicação). */
export const markVerifiedFn = httpsCallable<Record<string, never>, { ok: boolean }>(
  functions,
  'markVerified'
);

/**
 * Confirma o celular do CLIENTE por SMS sem virar credencial de login (evita
 * o conflito de "número já em uso" quando esse número já é o login de uma
 * conta de profissional). Valida o código no servidor; não chama
 * linkWithCredential/updatePhoneNumber no cliente.
 */
export const confirmClientPhoneFn = httpsCallable<
  { verificationId: string; code: string },
  { ok: boolean; phoneNumber: string }
>(functions, 'confirmClientPhone');

export const resolveSupportTicketFn = httpsCallable<
  { ticketId: string; decision: 'resolved' | 'rejected' | 'in_review'; note?: string; refundDiamonds?: number },
  { ok: boolean }
>(functions, 'resolveSupportTicket');

export const attachProfessionalToRequestFn = httpsCallable<
  { requestId: string; professionalId: string; message?: string },
  { ok: boolean; chatId: string }
>(functions, 'attachProfessionalToRequest');

export const reviewValidationFn = httpsCallable<
  { userId: string; decision: 'approved' | 'rejected' },
  { ok: boolean }
>(functions, 'reviewValidation');

export const simulatePurchaseFn = httpsCallable<
  { packageId: string; method: 'pix' | 'credit_card' },
  { ok: boolean; diamonds: number }
>(functions, 'simulatePurchase');

/** Mercado Pago Checkout Pro: cria a preferência e devolve a URL de checkout. */
export const createPaymentPreferenceFn = httpsCallable<
  { packageId: string; origin: string },
  { paymentId: string; initPoint: string }
>(functions, 'createPaymentPreference');

export const bootstrapAdminFn = httpsCallable<{ secret: string }, { ok: boolean; note?: string }>(
  functions,
  'bootstrapAdmin'
);

export const grantAdminFn = httpsCallable<{ email: string }, { ok: boolean }>(functions, 'grantAdmin');

/** Exclui a própria conta (LGPD). Apaga perfil, KYC, arquivos e anúncios; encerra o login. */
export const deleteMyAccountFn = httpsCallable<Record<string, never>, { ok: boolean }>(
  functions,
  'deleteMyAccount'
);

/** Extrai a mensagem amigável de um erro de callable (HttpsError). */
export function callableErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return fallback;
}

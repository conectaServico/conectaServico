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

/**
 * Chamada pelo cadastro de PROFISSIONAL antes de enviar o SMS: libera o
 * número no Firebase Auth se ele estiver "ocupado" por uma conta sem perfil
 * de profissional (órfã, ou de um cliente). Só recusa (already-exists) se já
 * houver uma conta de profissional de fato com esse número.
 */
export const prepareProfessionalPhoneFn = httpsCallable<{ phone: string }, { ok: boolean }>(
  functions,
  'prepareProfessionalPhone'
);

/** Envia o CPF para validação (KYC). Bloqueia CPF já usado por outra conta de profissional. */
export const submitCpfValidationFn = httpsCallable<{ cpf: string }, { ok: boolean }>(
  functions,
  'submitCpfValidation'
);

export const resolveSupportTicketFn = httpsCallable<
  { ticketId: string; decision: 'resolved' | 'rejected' | 'in_review'; note?: string; refundDiamonds?: number },
  { ok: boolean }
>(functions, 'resolveSupportTicket');

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

export interface AdminStats {
  totalClients: number;
  totalProfessionals: number;
  verifiedProfessionals: number;
  newClientsLast7Days: number;
  newProfessionalsLast7Days: number;
  totalRequests: number;
  requestsByStatus: Record<string, number>;
  revenue: {
    totalBRL: number;
    totalDiamondsSold: number;
    approvedPayments: number;
  };
  mpMode: 'test' | 'live' | 'unset';
}
export const getAdminStatsFn = httpsCallable<Record<string, never>, AdminStats>(functions, 'getAdminStats');

export interface AdminCharts {
  days: string[]; // 'YYYY-MM-DD', últimos 14 dias em ordem crescente
  newClientsByDay: Record<string, number>;
  newProfessionalsByDay: Record<string, number>;
  revenueByDay: Record<string, number>;
  topProfessionals: Array<{
    userId: string;
    name: string;
    email: string;
    totalBRL: number;
    paymentsCount: number;
  }>;
}
export const getAdminChartsFn = httpsCallable<Record<string, never>, AdminCharts>(functions, 'getAdminCharts');

export interface AdminUserHit {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  coinsBalance: number;
  created_at: number;
}
/** Busca usuário pra suporte: e-mail exato ou nome (via searchTokens, sem distinguir acento/maiúscula). */
export const adminSearchUsersFn = httpsCallable<{ query: string }, { results: AdminUserHit[] }>(
  functions,
  'adminSearchUsers'
);

/** Lista todos os clientes ou todos os profissionais, paginado por created_at desc. */
export const adminListUsersFn = httpsCallable<
  { role: 'client' | 'professional'; cursorCreatedAt?: number | null },
  { results: AdminUserHit[]; nextCursor: number | null }
>(functions, 'adminListUsers');

/** Dá (amount > 0) ou desconta (amount < 0) diamantes de uma conta na mão, com motivo opcional. */
export const adminAdjustDiamondsFn = httpsCallable<{ userId: string; amount: number; reason?: string }, { ok: boolean }>(
  functions,
  'adminAdjustDiamonds'
);

export interface AdminUserDetail {
  user: Record<string, unknown> & { id: string };
  recentRequests: Record<string, unknown>[];
  recentProposals: Record<string, unknown>[];
  recentTransactions: Record<string, unknown>[];
  recentPayments: Record<string, unknown>[];
  recentTickets: Record<string, unknown>[];
  validation: Record<string, unknown> | null;
}
/** Retrato completo de uma conta (pedidos/propostas/transações/pagamentos/chamados recentes) pra atender suporte. */
export const adminGetUserDetailFn = httpsCallable<{ userId: string }, AdminUserDetail>(
  functions,
  'adminGetUserDetail'
);

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

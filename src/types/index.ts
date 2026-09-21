export type UserRole = 'client' | 'professional';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  verified: boolean;
  cpf_hash?: string;
  photo_url?: string;
  city: string;
  state?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  coinsBalance?: number;
  services?: string[]; // Categorias de serviços que o profissional presta
  customServices?: string[]; // "Outros serviços" em texto livre (opcional, até 10) — só aparecem no perfil e na busca
  serviceCategories?: string[]; // Nomes das categorias-pai selecionadas (para filtro exato)
  bio?: string; // Biografia do profissional
  rating?: number; // Média de avaliações (do profissional, feitas por clientes)
  ratingSum?: number; // Soma das notas (mantido pelo servidor para recomputar rating em O(1))
  reviewCount?: number; // Quantidade de avaliações
  clientRating?: number; // Média do cliente, avaliada por profissionais
  clientRatingSum?: number;
  clientReviewCount?: number;
  radiusKm?: number; // Raio de atuação em KM (para profissionais)
  // Localização normalizada (escrita em todo create/update de usuário)
  uf?: string; // UF validada, 2 letras maiúsculas
  cityKey?: string; // cidade sem acento, minúscula, sem espaços extras
  lat?: number;
  lng?: number;
  geohash?: string;
  geoPrecise?: boolean; // true = coords do CEP; false = centroide da UF (fallback)
  isAdmin?: boolean; // espelho do custom claim `admin` (definido por Function)
  fcmTokens?: string[]; // tokens de push (web/native) — usados para avisar o profissional de novos leads
  fcmUpdatedAt?: number;
  termsAcceptedAt?: number; // aceite dos Termos/Política (LGPD) — obrigatório no cadastro
  termsVersion?: string;
  contactsVerified?: boolean; // e-mail + telefone confirmados (marcado por Function)
  // Cliente: celular confirmado por SMS sem virar credencial de login (evita conflito
  // quando o mesmo número já é o login de uma conta de profissional). Marcado por Function.
  phoneConfirmed?: boolean;
  phoneConfirmedAt?: number;
  referredBy?: string; // uid de quem indicou este usuário
  referralRewarded?: boolean; // o bônus de indicação já foi pago ao referenciador?
  referralCount?: number; // quantos indicados verificaram a conta (bônus pago)
  created_at: number;
}

export const TERMS_VERSION = '2026-09-12';

/**
 * Projeção pública de `User` (coleção `publicProfiles`, mantida pela Function syncPublicProfile).
 * É o que o app mostra de OUTra pessoa — sem telefone, e-mail, endereço ou saldo.
 */
export interface PublicProfile {
  id: string;
  name: string;
  role: UserRole;
  photo_url?: string;
  city?: string;
  state?: string;
  uf?: string;
  bio?: string;
  services?: string[];
  customServices?: string[];
  serviceCategories?: string[];
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  searchTokens?: string[]; // gerado pela Function syncPublicProfile (busca textual MVP)
  created_at: number;
}

export type RequestStatus = 'OPEN' | 'NEGOTIATING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'EXPIRED';
export type Urgency = 'Baixa (Pode esperar)' | 'Média (Próximas semanas)' | 'Alta (O quanto antes)' | 'Emergência (Imediato)';
export type MaterialOption = 'O profissional fornece' | 'Eu fornecerei' | 'A combinar';

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName?: string; // 1º nome + inicial exibidos antes do desbloqueio (não sensível)
  clientRating?: number; // reputação do cliente no momento do pedido (desnormalizado)
  clientReviewCount?: number;
  category: string;
  subcategory?: string;
  propertyType: string;
  areaSize?: string; // Metro quadrado (m²) do serviço
  hasBlueprint?: boolean; // Se possui planta do projeto
  serviceType?: string; // Tipo específico dentro da subcategoria (ex.: Eletricista > "Instalação de ar condicionado")
  availableDays?: string[]; // Dias que o cliente pode receber o profissional (Serviços gerais/Limpeza)
  availablePeriods?: string[]; // Períodos do dia (Manhã/Tarde/Noite)
  preferredDate?: string; // Data preferencial para o serviço
  description: string;
  photos?: string[]; // fotos anexadas pelo cliente (Storage requestPhotos/<uid>/<reqId>)
  searchTokens?: string[]; // busca textual MVP (gerado no create)
  city: string;
  state?: string;
  neighborhood: string;
  street: string;
  number: string;
  complement?: string;
  cep: string;
  urgency: Urgency;
  materialOption: MaterialOption;
  status: RequestStatus;
  acceptedProfessionalId?: string;
  acceptedProposalId?: string;
  unlockCount?: number;
  // Localização normalizada (escrita em todo create de pedido)
  uf?: string;
  cityKey?: string;
  lat?: number;
  lng?: number;
  geohash?: string;
  geoPrecise?: boolean; // true = coords do CEP; false = centroide da UF (fallback)
  started_at?: number;
  completed_at?: number;
  canceled_at?: number;
  updated_at?: number;
  created_at: number;
}

export type JobRequest = ServiceRequest;

export interface Proposal {
  id: string;
  requestId: string;
  professionalId: string;
  clientId?: string; // Desnormalizado do pedido para permitir que o cliente consulte suas propostas sem varrer a coleção
  estimatedPrice: number;
  estimatedDays: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  accepted_at?: number;
  updated_at?: number;
  created_at: number;
  // Dados desnormalizados do profissional para facilitar a leitura no card
  professionalName?: string;
  professionalRating?: number;
  professionalPhoto?: string;
  professionalVerified?: boolean;
}

export interface Chat {
  id: string;
  requestId: string;
  clientId: string;
  professionalId: string;
  last_message?: string;
  updated_at: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type?: 'text' | 'image';
  text: string;
  imageUrl?: string;
  read?: boolean;
  created_at: number;
}

export interface Review {
  id: string;
  requestId: string;
  clientId: string;
  professionalId: string;
  rating: number;
  comment: string;
  wouldHireAgain: boolean;
  created_at: number;
}

/** Avaliação do CLIENTE feita pelo profissional contratado (após o serviço concluído). */
export interface ClientReview {
  id: string;
  requestId: string;
  clientId: string;
  professionalId: string;
  rating: number;
  comment: string;
  smoothDeal: boolean; // negociação/pagamento tranquilos
  created_at: number;
}

export interface Unlock {
  id: string;
  requestId: string;
  professionalId: string;
  cost: number;
  created_at: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'BONUS_SIGNUP' | 'UNLOCK_CONTACT' | 'REFUND' | 'PURCHASE' | 'ADJUSTMENT';
  description: string;
  created_at: number;
}

export type SupportCategory =
  | 'fake_lead'
  | 'no_show'
  | 'abusive'
  | 'payment'
  | 'app_error'
  | 'other';
export type SupportStatus = 'open' | 'in_review' | 'resolved' | 'rejected';

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole | string;
  category: SupportCategory;
  subject: string;
  message: string;
  requestId?: string; // pedido relacionado (ex.: denúncia de lead falso)
  status: SupportStatus;
  resolution?: string; // resposta do admin
  refundedDiamonds?: number;
  reviewed_by?: string;
  created_at: number;
  updated_at?: number;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'in_process' | 'error';

export interface Payment {
  id: string;
  userId: string;
  packageId: string;
  diamonds: number;
  amount: number;
  currency: string;
  provider: 'mercadopago' | 'google_play';
  status: PaymentStatus;
  mpPreferenceId?: string;
  mpPaymentId?: string;
  created_at: number;
  updated_at: number;
}

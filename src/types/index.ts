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
  bio?: string; // Biografia do profissional
  rating?: number; // Média de avaliações
  reviewCount?: number; // Quantidade de avaliações
  radiusKm?: number; // Raio de atuação em KM (para profissionais)
  created_at: number;
}

export type RequestStatus = 'OPEN' | 'NEGOTIATING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
export type Urgency = 'Baixa (Pode esperar)' | 'Média (Próximas semanas)' | 'Alta (O quanto antes)' | 'Emergência (Imediato)';
export type MaterialOption = 'O profissional fornece' | 'Eu fornecerei' | 'A combinar';

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName?: string;
  clientPhone?: string;
  category: string;
  subcategory?: string;
  propertyType: string;
  areaSize?: string; // Metro quadrado (m²) do serviço
  hasBlueprint?: boolean; // Se possui planta do projeto
  preferredDate?: string; // Data preferencial para o serviço
  description: string;
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
  started_at?: number;
  completed_at?: number;
  canceled_at?: number;
  created_at: number;
}

export type JobRequest = ServiceRequest;

export interface Proposal {
  id: string;
  requestId: string;
  professionalId: string;
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
  text: string;
  imageUrl?: string;
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
  type: 'BONUS_SIGNUP' | 'UNLOCK_CONTACT' | 'REFUND';
  description: string;
  created_at: number;
}

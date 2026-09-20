import { create } from 'zustand';

export type Audience = 'client' | 'professional';

const STORAGE_KEY = 'home_audience';

// Lido direto de import.meta.env aqui (em vez de importar appTarget.ts) pra
// evitar import circular — appTarget.ts importa o tipo Audience daqui.
const LOCKED: Audience | null =
  import.meta.env.VITE_APP_AUDIENCE === 'professional'
    ? 'professional'
    : import.meta.env.VITE_APP_AUDIENCE === 'client'
      ? 'client'
      : null;

const read = (): Audience => {
  if (LOCKED) return LOCKED;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'professional' ? 'professional' : 'client';
  } catch {
    return 'client';
  }
};

interface AudienceState {
  /** Qual "lado" da home o visitante deslogado está vendo (cliente x profissional). */
  audience: Audience;
  setAudience: (a: Audience) => void;
}

export const useAudienceStore = create<AudienceState>((set) => ({
  audience: read(),
  setAudience: (audience) => {
    if (LOCKED) return; // app nativo: cliente e profissional são apps separados, não trocam de lado
    try {
      localStorage.setItem(STORAGE_KEY, audience);
    } catch {
      /* sem persistência não é problema */
    }
    set({ audience });
  },
}));

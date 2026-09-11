import { create } from 'zustand';

export type Audience = 'client' | 'professional';

const STORAGE_KEY = 'home_audience';

const read = (): Audience => {
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
    try {
      localStorage.setItem(STORAGE_KEY, audience);
    } catch {
      /* sem persistência não é problema */
    }
    set({ audience });
  },
}));

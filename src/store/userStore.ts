import { create } from 'zustand';
import { signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { User, UserRole } from '@/types';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  // Vêm do Firebase Auth (não do doc do Firestore) — verificação de e-mail / telefone.
  emailVerified: boolean;
  phoneVerified: boolean;
  // Como a sessão foi criada: 'password' (cliente), 'phone' (profissional), 'google.com'...
  signInProvider: string | null;
  setUser: (user: User | null) => void;
  setAuthenticated: (status: boolean) => void;
  setRole: (role: UserRole | null) => void;
  setVerification: (v: {
    emailVerified: boolean;
    phoneVerified: boolean;
    signInProvider?: string | null;
  }) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,
  role: null,
  emailVerified: false,
  phoneVerified: false,
  signInProvider: null,
  setUser: (user) => set({ user, isAuthenticated: !!user, role: user?.role || null }),
  setAuthenticated: (status) => set({ isAuthenticated: status }),
  setRole: (role) => set({ role }),
  setVerification: (v) =>
    set((s) => ({
      emailVerified: v.emailVerified,
      phoneVerified: v.phoneVerified,
      signInProvider: v.signInProvider !== undefined ? v.signInProvider : s.signInProvider,
    })),
  logout: () => {
    // encerra a sessão do Firebase Auth de verdade (antes só limpava o estado local)
    if (auth) signOut(auth).catch((e) => console.error('signOut falhou:', e));
    set({
      user: null,
      isAuthenticated: false,
      role: null,
      emailVerified: false,
      phoneVerified: false,
      signInProvider: null,
    });
  },
}));

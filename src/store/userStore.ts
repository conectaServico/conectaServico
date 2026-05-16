import { create } from 'zustand';
import { User, UserRole } from '@/types';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  setUser: (user: User | null) => void;
  setAuthenticated: (status: boolean) => void;
  setRole: (role: UserRole | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,
  role: null,
  setUser: (user) => set({ user, isAuthenticated: !!user, role: user?.role || null }),
  setAuthenticated: (status) => set({ isAuthenticated: status }),
  setRole: (role) => set({ role }),
  logout: () => set({ user: null, isAuthenticated: false, role: null }),
}));

import { create } from 'zustand';

interface Profile {
  id: string;
  nome: string | null;
  apelido: string | null;
  email: string | null;
  plano: 'free' | 'pro';
  xp_total: number;
  nivel: number;
  moedas: number;
  preferencias: {
    modo_baixo_estimulo: boolean;
    reduzir_animacoes: boolean;
    tema: 'light' | 'dark' | 'system';
    fonte: 'padrao' | 'dislexia';
  };
}

interface UserState {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  updateProfile: (partial: Partial<Profile>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateProfile: (partial) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...partial } : null,
    })),
}));

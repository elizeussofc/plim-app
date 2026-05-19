import { create } from 'zustand';

export interface Conquista {
  id: string;
  nome: string;
  desc: string;
  icone: string;
  desbloqueada: boolean;
  desbloqueadaEm?: string;
}

const conquistasIniciais: Conquista[] = [
  { id: 'primeiro_passo', nome: 'Primeiro Passo', desc: 'Completou a primeira tarefa', icone: '⚡', desbloqueada: false },
  { id: 'despejou', nome: 'Despejou a Mente', desc: 'Usou o Despejo Mental', icone: '🧠', desbloqueada: false },
  { id: 'foco_total', nome: 'Foco Total', desc: 'Completou uma sessão de foco', icone: '🎯', desbloqueada: false },
  { id: 'tres_dias', nome: '3 Dias Seguidos', desc: 'Streak de 3 dias', icone: '🔥', desbloqueada: false },
  { id: 'comunidade', nome: 'Não Tá Só', desc: 'Compartilhou na comunidade', icone: '🤝', desbloqueada: false },
  { id: 'semana_perfeita', nome: 'Semana Perfeita', desc: '7 dias completos', icone: '🏆', desbloqueada: false },
];

export interface Profile {
  id: string;
  nome: string | null;
  apelido: string | null;
  bio: string | null;
  instagram: string | null;
  email: string | null;
  plano: 'free' | 'pro';
  xp_total: number;
  nivel: number;
  moedas: number;
  streak: number;
  avatar_emoji: string;
  conquistas: Conquista[];
  preferencias: {
    modo_baixo_estimulo: boolean;
    reduzir_animacoes: boolean;
    tema: 'light' | 'dark' | 'system';
    fonte: 'padrao' | 'dislexia';
  };
}

interface UserState {
  profile: Profile;
  setProfile: (profile: Partial<Profile>) => void;
  updateProfile: (partial: Partial<Profile>) => void;
  addXp: (quantidade: number) => void;
  addMoedas: (quantidade: number) => void;
  incrementStreak: () => void;
  unlockConquista: (id: string) => void;
}

const profilePadrao: Profile = {
  id: 'local',
  nome: null,
  apelido: null,
  bio: null,
  instagram: null,
  email: null,
  plano: 'free',
  xp_total: 0,
  nivel: 1,
  moedas: 0,
  streak: 0,
  avatar_emoji: '⚡',
  conquistas: conquistasIniciais,
  preferencias: {
    modo_baixo_estimulo: false,
    reduzir_animacoes: false,
    tema: 'light',
    fonte: 'padrao',
  },
};

function calcularNivel(xp: number): number {
  if (xp < 100) return 1;
  if (xp < 250) return 2;
  if (xp < 500) return 3;
  if (xp < 1000) return 4;
  return Math.floor(xp / 250) + 1;
}

export const useUserStore = create<UserState>((set) => ({
  profile: profilePadrao,

  setProfile: (profile) =>
    set((s) => ({ profile: { ...s.profile, ...profile } })),

  updateProfile: (partial) =>
    set((s) => ({ profile: { ...s.profile, ...partial } })),

  addXp: (quantidade) =>
    set((s) => {
      const novoXp = s.profile.xp_total + quantidade;
      return { profile: { ...s.profile, xp_total: novoXp, nivel: calcularNivel(novoXp) } };
    }),

  addMoedas: (quantidade) =>
    set((s) => ({ profile: { ...s.profile, moedas: s.profile.moedas + quantidade } })),

  incrementStreak: () =>
    set((s) => {
      const novoStreak = s.profile.streak + 1;
      const conquistas = s.profile.conquistas.map((c) => {
        if (c.id === 'tres_dias' && novoStreak >= 3 && !c.desbloqueada)
          return { ...c, desbloqueada: true, desbloqueadaEm: new Date().toISOString() };
        if (c.id === 'semana_perfeita' && novoStreak >= 7 && !c.desbloqueada)
          return { ...c, desbloqueada: true, desbloqueadaEm: new Date().toISOString() };
        return c;
      });
      return { profile: { ...s.profile, streak: novoStreak, conquistas } };
    }),

  unlockConquista: (id) =>
    set((s) => ({
      profile: {
        ...s.profile,
        conquistas: s.profile.conquistas.map((c) =>
          c.id === id && !c.desbloqueada
            ? { ...c, desbloqueada: true, desbloqueadaEm: new Date().toISOString() }
            : c
        ),
      },
    })),
}));

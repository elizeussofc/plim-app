import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { avatarConfigPadrao, type AvatarConfig } from '@/components/AvatarPersonagem';
export type { AvatarConfig };

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
  avatar_config: import('@/components/AvatarPersonagem').AvatarConfig;
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
  updateAvatarConfig: (config: Partial<import('@/components/AvatarPersonagem').AvatarConfig>) => void;
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
  avatar_config: { ...avatarConfigPadrao },
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

const STORAGE_KEY = 'plim-user-store';

export const useUserStore = create<UserState>((set) => ({
  profile: profilePadrao,

  setProfile: (profile) =>
    set((s) => ({ profile: { ...s.profile, ...profile } })),

  updateProfile: (partial) =>
    set((s) => ({ profile: { ...s.profile, ...partial } })),

  updateAvatarConfig: (config) =>
    set((s) => ({
      profile: { ...s.profile, avatar_config: { ...s.profile.avatar_config, ...config } },
    })),

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

// ── Hidratação manual (compatível com Expo web + native) ──────────────────────

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (saved?.profile) {
      const loaded = { ...saved.profile };
      // Migra avatar_config antigo (skinTom-based) para o novo formato DiceBear
      if (loaded.avatar_config && 'skinTom' in loaded.avatar_config) {
        loaded.avatar_config = { ...avatarConfigPadrao };
      } else if (loaded.avatar_config && !Array.isArray(loaded.avatar_config.features)) {
        loaded.avatar_config.features = [];
      }
      useUserStore.setState((s) => ({
        profile: { ...s.profile, ...loaded },
      }));
    }
  } catch {}
}).catch(() => {});

// Salva 400ms após a última mudança (debounce)
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useUserStore.subscribe((state) => {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: state.profile })).catch(() => {});
  }, 400);
});

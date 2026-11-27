import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { avatarConfigPadrao, normalizarAvatar, type AvatarConfig } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';
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
  avatar_config: AvatarConfig;
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
  updateAvatarConfig: (config: Partial<AvatarConfig>) => void;
  addXp: (quantidade: number) => void;
  addMoedas: (quantidade: number) => void;
  incrementStreak: () => void;
  /** Define a sequência de dias (calculada pelo histórico da rotina) e libera as conquistas dela. */
  definirStreak: (dias: number) => void;
  unlockConquista: (id: string) => void;
  loadFromSupabase: (userId: string) => Promise<void>;
  resetProfile: () => void;
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

  definirStreak: (dias) =>
    set((s) => {
      const agora = new Date().toISOString();
      const conquistas = s.profile.conquistas.map((c) => {
        const meta = c.id === 'tres_dias' ? 3 : c.id === 'semana_perfeita' ? 7 : 0;
        return meta && dias >= meta && !c.desbloqueada ? { ...c, desbloqueada: true, desbloqueadaEm: agora } : c;
      });
      return { profile: { ...s.profile, streak: dias, conquistas } };
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

  loadFromSupabase: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return;
    set((s) => ({
      profile: {
        ...s.profile,
        id: userId,
        nome: data.nome ?? s.profile.nome,
        apelido: data.apelido ?? s.profile.apelido,
        bio: data.bio ?? s.profile.bio,
        instagram: data.instagram ?? s.profile.instagram,
        email: data.email ?? s.profile.email,
        plano: data.plano ?? s.profile.plano,
        xp_total: data.xp_total ?? s.profile.xp_total,
        nivel: data.nivel ?? s.profile.nivel,
        moedas: data.moedas ?? s.profile.moedas,
        streak: data.streak ?? s.profile.streak,
        avatar_emoji: data.avatar_emoji ?? s.profile.avatar_emoji,
        avatar_config: data.avatar_config ? normalizarAvatar(data.avatar_config) : s.profile.avatar_config,
        conquistas: data.conquistas?.length ? data.conquistas : s.profile.conquistas,
        preferencias: data.preferencias ?? s.profile.preferencias,
      },
    }));
  },

  resetProfile: () => set({ profile: { ...profilePadrao } }),
}));

// ── Hidratação manual (compatível com Expo web + native) ──────────────────────

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (saved?.profile) {
      const loaded = { ...saved.profile };
      // Converte qualquer avatar salvo antes (2D DiceBear ou o formato skinTom) para o 3D.
      loaded.avatar_config = normalizarAvatar(loaded.avatar_config);
      useUserStore.setState((s) => ({
        profile: { ...s.profile, ...loaded },
      }));
    }
  } catch {}
}).catch(() => {});

// Salva 400ms após a última mudança (debounce) — local + Supabase
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useUserStore.subscribe((state) => {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const { profile } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ profile })).catch(() => {});

    if (profile.id === 'local') return;
    supabase.from('profiles').upsert({
      id: profile.id,
      nome: profile.nome,
      apelido: profile.apelido,
      bio: profile.bio,
      instagram: profile.instagram,
      email: profile.email,
      // `plano` não é enviado: só o servidor (webhooks) define quem é Pro.
      xp_total: profile.xp_total,
      nivel: profile.nivel,
      moedas: profile.moedas,
      streak: profile.streak,
      avatar_emoji: profile.avatar_emoji,
      avatar_config: profile.avatar_config,
      conquistas: profile.conquistas,
      preferencias: profile.preferencias,
    }).then(() => {});
  }, 400);
});

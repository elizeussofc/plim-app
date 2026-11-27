import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { limitarNivel, resultadoDaMissao, type AreaId, type Missao, type MissaoPropria, type Resultado } from '@/lib/trilhas';

/** Uma trilha que a pessoa segue: a área, o nível atual e o placar. */
export interface TrilhaAtiva {
  area: AreaId;
  nivel: number;
  sucessos: number;
  falhas: number;
  proprias: MissaoPropria[];
}

/** A missão em andamento. O relógio conta por `fimEm`, então sobrevive a fechar o app. */
export interface MissaoAtiva {
  area: AreaId;
  missaoId: string;
  titulo: string;
  minutos: number;
  nivel: number;
  inicioEm: number;
  fimEm: number;
}

export interface UltimoResultado extends Resultado {
  area: AreaId;
  titulo: string;
}

interface TrilhaState {
  trilhas: TrilhaAtiva[];
  ativa: MissaoAtiva | null;
  ultimo: UltimoResultado | null;
  adicionarTrilha: (area: AreaId, nivel: number) => void;
  removerTrilha: (area: AreaId) => void;
  criarMissao: (area: AreaId, titulo: string, minutos: number) => void;
  removerMissao: (area: AreaId, id: string) => void;
  iniciar: (missao: Missao, minutos: number) => void;
  /** Fecha a missão em andamento, ajusta o nível da trilha e devolve o resultado. `teto` = nível máximo do plano. */
  encerrar: (sucesso: boolean, teto?: number) => UltimoResultado | null;
  limparResultado: () => void;
}

export const useTrilhaStore = create<TrilhaState>((set, get) => ({
  trilhas: [],
  ativa: null,
  ultimo: null,

  adicionarTrilha: (area, nivel) =>
    set((s) => (s.trilhas.some((t) => t.area === area)
      ? s
      : { trilhas: [...s.trilhas, { area, nivel: limitarNivel(nivel), sucessos: 0, falhas: 0, proprias: [] }] })),

  removerTrilha: (area) =>
    set((s) => ({ trilhas: s.trilhas.filter((t) => t.area !== area), ativa: s.ativa?.area === area ? null : s.ativa })),

  criarMissao: (area, titulo, minutos) =>
    set((s) => ({
      trilhas: s.trilhas.map((t) => (t.area !== area ? t : {
        ...t,
        proprias: [...t.proprias, { id: `propria:${Date.now()}`, titulo: titulo.trim(), minutos: Math.max(1, Math.round(minutos)) }].slice(-6),
      })),
    })),

  removerMissao: (area, id) =>
    set((s) => ({ trilhas: s.trilhas.map((t) => (t.area !== area ? t : { ...t, proprias: t.proprias.filter((p) => p.id !== id) })) })),

  iniciar: (missao, minutos) => {
    const trilha = get().trilhas.find((t) => t.area === missao.area);
    if (!trilha) return;
    const agora = Date.now();
    const min = Math.max(1, Math.round(minutos));
    set({
      ultimo: null,
      ativa: { area: missao.area, missaoId: missao.id, titulo: missao.titulo, minutos: min, nivel: trilha.nivel, inicioEm: agora, fimEm: agora + min * 60_000 },
    });
  },

  encerrar: (sucesso, teto) => {
    const { ativa, trilhas } = get();
    if (!ativa) return null;
    const trilha = trilhas.find((t) => t.area === ativa.area);
    const resultado = resultadoDaMissao(trilha?.nivel ?? ativa.nivel, sucesso, teto);
    const ultimo: UltimoResultado = { ...resultado, area: ativa.area, titulo: ativa.titulo };
    set({
      ativa: null,
      ultimo,
      trilhas: trilhas.map((t) => (t.area !== ativa.area ? t : {
        ...t,
        nivel: resultado.nivelDepois,
        sucessos: t.sucessos + (sucesso ? 1 : 0),
        falhas: t.falhas + (sucesso ? 0 : 1),
      })),
    });
    return ultimo;
  },

  limparResultado: () => set({ ultimo: null }),
}));

// ── Guarda no aparelho ──────────────────────────────────────────────────────

const STORAGE_KEY = 'plim-trilha-store';

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (Array.isArray(saved?.trilhas)) {
      useTrilhaStore.setState({
        trilhas: saved.trilhas.map((t: TrilhaAtiva) => ({ ...t, nivel: limitarNivel(t.nivel), proprias: Array.isArray(t.proprias) ? t.proprias : [] })),
        ativa: saved.ativa && typeof saved.ativa.fimEm === 'number' ? saved.ativa : null,
      });
    }
  } catch {}
}).catch(() => {});

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useTrilhaStore.subscribe((state) => {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ trilhas: state.trilhas, ativa: state.ativa })).catch(() => {});
  }, 300);
});

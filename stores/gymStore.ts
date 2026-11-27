import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { hojeLocal } from '@/lib/dia';
import type { PerfilGym, Registro, SerieFeita } from '@/lib/gym';

/** Um treino que a pessoa terminou. */
export interface TreinoFeito {
  data: string;
  diaId: string;
  nome: string;
  series: number;
}

interface GymState {
  /** Já leu o que estava guardado no aparelho? Antes disso a tela espera, para não piscar o formulário. */
  carregado: boolean;
  perfil: PerfilGym | null;
  /** Dia em que a pessoa começou o programa (AAAA-MM-DD): daí sai a semana do plano. */
  inicio: string;
  /** Qual treino da divisão é o próximo (gira a cada treino feito). */
  proximo: number;
  /** Histórico por exercício, o mais recente por último. */
  historico: Record<string, Registro[]>;
  treinos: TreinoFeito[];
  /** Aba que outra tela pediu para abrir no Gym (não é guardada). */
  abaPedida: 'comida' | null;
  pedirAba: (aba: 'comida' | null) => void;
  salvarPerfil: (p: PerfilGym) => void;
  /** Guarda o treino terminado, com as séries feitas em cada exercício. */
  registrarTreino: (diaId: string, nome: string, total: number, feito: Record<string, { series: SerieFeita[]; min: number; max: number }>) => void;
  apagarTudo: () => void;
}

const MAX_POR_EXERCICIO = 12;
const MAX_TREINOS = 90;

export const useGymStore = create<GymState>((set) => ({
  carregado: false,
  perfil: null,
  inicio: '',
  proximo: 0,
  historico: {},
  treinos: [],
  abaPedida: null,

  pedirAba: (abaPedida) => set({ abaPedida }),

  salvarPerfil: (p) => set((s) => ({ perfil: p, inicio: s.inicio || hojeLocal(), proximo: s.perfil && s.perfil.dias === p.dias ? s.proximo : 0 })),

  registrarTreino: (diaId, nome, total, feito) =>
    set((s) => {
      const data = hojeLocal();
      const historico = { ...s.historico };
      let series = 0;
      for (const [id, r] of Object.entries(feito)) {
        if (r.series.length === 0) continue;
        series += r.series.length;
        historico[id] = [...(historico[id] ?? []), { data, series: r.series, min: r.min, max: r.max }].slice(-MAX_POR_EXERCICIO);
      }
      return {
        historico,
        proximo: (s.proximo + 1) % Math.max(1, total),
        treinos: [...s.treinos, { data, diaId, nome, series }].slice(-MAX_TREINOS),
      };
    }),

  apagarTudo: () => set({ perfil: null, inicio: '', proximo: 0, historico: {}, treinos: [] }),
}));

const STORAGE_KEY = 'plim-gym-store';

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (!raw) { useGymStore.setState({ carregado: true }); return; }
  try {
    const s = JSON.parse(raw);
    if (s && typeof s === 'object') {
      useGymStore.setState({
        perfil: s.perfil ?? null,
        inicio: typeof s.inicio === 'string' ? s.inicio : '',
        proximo: Number.isInteger(s.proximo) ? s.proximo : 0,
        historico: s.historico && typeof s.historico === 'object' ? s.historico : {},
        treinos: Array.isArray(s.treinos) ? s.treinos : [],
      });
    }
  } catch {}
  useGymStore.setState({ carregado: true });
}).catch(() => { useGymStore.setState({ carregado: true }); });

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useGymStore.subscribe((s) => {
  if (!s.carregado) return; // nada de gravar por cima antes de ler
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ perfil: s.perfil, inicio: s.inicio, proximo: s.proximo, historico: s.historico, treinos: s.treinos })).catch(() => {});
  }, 300);
});

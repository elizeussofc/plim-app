import { create } from 'zustand';

export interface RegistroHumor {
  data: string; // 'YYYY-MM-DD'
  humor: 1 | 2 | 3 | 4 | 5;
}

export const humorConfig = {
  1: { emoji: '😫', label: 'Péssimo', cor: '#EF4444' },
  2: { emoji: '😟', label: 'Ruim', cor: '#F97316' },
  3: { emoji: '😐', label: 'Ok', cor: '#EAB308' },
  4: { emoji: '🙂', label: 'Bem', cor: '#22C55E' },
  5: { emoji: '😊', label: 'Ótimo', cor: '#7C3AED' },
} as const;

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

interface HumorState {
  historico: RegistroHumor[]; // últimos 30 dias
  registrarHumor: (humor: 1 | 2 | 3 | 4 | 5) => void;
  humorHoje: () => RegistroHumor | undefined;
}

export const useHumorStore = create<HumorState>((set, get) => ({
  historico: [],

  registrarHumor: (humor) => {
    const data = hoje();
    set((s) => {
      const semHoje = s.historico.filter((r) => r.data !== data);
      const novo = [{ data, humor }, ...semHoje].slice(0, 30);
      return { historico: novo };
    });
  },

  humorHoje: () => get().historico.find((r) => r.data === hoje()),
}));

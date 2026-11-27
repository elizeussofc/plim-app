import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { hojeLocal } from '@/lib/dia';

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
  return hojeLocal();
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

// O humor não era guardado: sumia ao recarregar o app. O resumo da semana precisa dele.
const STORAGE_KEY = 'plim-humor-store';
let _carregado = false;

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (Array.isArray(s?.historico)) {
        const validos = s.historico.filter((r: RegistroHumor) => typeof r?.data === 'string' && r.humor >= 1 && r.humor <= 5);
        // Junta com o que a pessoa já marcou nesta sessão antes de a leitura terminar.
        useHumorStore.setState((atual) => {
          const datas = new Set(atual.historico.map((r) => r.data));
          return { historico: [...atual.historico, ...validos.filter((r: RegistroHumor) => !datas.has(r.data))].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 30) };
        });
      }
    } catch {}
  }
  _carregado = true;
}).catch(() => { _carregado = true; });

useHumorStore.subscribe((s) => {
  if (!_carregado) return; // nada de gravar por cima antes de ler
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ historico: s.historico })).catch(() => {});
});

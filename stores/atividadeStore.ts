import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { diasAntes, hojeLocal } from '@/lib/dia';

/**
 * Diário de atividade: quantos minutos de foco e quantas missões por dia.
 * O app dava XP por isso mas não guardava a data; sem a data não existe resumo da semana.
 * Também guarda a leitura que a Plim IA fez da semana, para não gastar outra mensagem ao reabrir.
 */
interface Dia { foco?: number; missoes?: number }

interface AtividadeState {
  carregado: boolean;
  dias: Record<string, Dia>;
  leitura: { ate: string; texto: string } | null;
  registrar: (tipo: keyof Dia, quantidade?: number) => void;
  guardarLeitura: (ate: string, texto: string) => void;
}

const DIAS_GUARDADOS = 70;

export const useAtividadeStore = create<AtividadeState>((set) => ({
  carregado: false,
  dias: {},
  leitura: null,

  registrar: (tipo, quantidade = 1) => {
    if (!(quantidade > 0)) return;
    const hoje = hojeLocal();
    const limite = diasAntes(hoje, DIAS_GUARDADOS);
    set((s) => {
      const dias: Record<string, Dia> = {};
      for (const [data, d] of Object.entries(s.dias)) if (data >= limite) dias[data] = d;
      dias[hoje] = { ...dias[hoje], [tipo]: (dias[hoje]?.[tipo] ?? 0) + Math.round(quantidade) };
      return { dias };
    });
  },

  guardarLeitura: (ate, texto) => set({ leitura: { ate, texto } }),
}));

/** Atalho para chamar de fora de componente. */
export function registrarAtividade(tipo: keyof Dia, quantidade = 1) {
  useAtividadeStore.getState().registrar(tipo, quantidade);
}

const STORAGE_KEY = 'plim-atividade-store';

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        useAtividadeStore.setState({
          dias: s.dias && typeof s.dias === 'object' ? s.dias : {},
          leitura: s.leitura?.ate && typeof s.leitura.texto === 'string' ? s.leitura : null,
        });
      }
    } catch {}
  }
  useAtividadeStore.setState({ carregado: true });
}).catch(() => { useAtividadeStore.setState({ carregado: true }); });

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useAtividadeStore.subscribe((s) => {
  if (!s.carregado) return; // nada de gravar por cima antes de ler
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ dias: s.dias, leitura: s.leitura })).catch(() => {});
  }, 300);
});

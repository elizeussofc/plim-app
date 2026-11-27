import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { hojeLocal } from '@/lib/dia';
import { calcularStatusDia, virarDia, type StatusDia, type StatusTarefa, type Tarefa } from '@/lib/rotinaDia';

export { calcularStatusDia };
export type { StatusDia, StatusTarefa, Tarefa };

interface RotinaState {
  tarefas: Tarefa[];
  historicoDias: Record<string, StatusDia>; // 'AAAA-MM-DD' (fuso do aparelho) → status
  /** Dia a que os status das tarefas se referem. Quando muda, a rotina recomeça. */
  diaAtual: string;
  /** Tarefas que já deram XP hoje (marcar, desmarcar e marcar de novo não dá XP outra vez). */
  premiadasHoje: string[];
  adicionarTarefa: (t: Omit<Tarefa, 'id' | 'status' | 'lembreteAgendado' | 'calendarioAdicionado'>) => void;
  alternarStatus: (id: string) => void;
  /** Marca como feita direto (botão "Feito" do início). */
  concluir: (id: string) => void;
  definirStatus: (id: string, status: StatusTarefa) => void;
  marcarPremiada: (id: string) => void;
  marcarLembrete: (id: string, valor: boolean) => void;
  marcarCalendario: (id: string, valor: boolean) => void;
  removerTarefa: (id: string) => void;
  resetarDia: () => void;
  registrarDiaNoHistorico: () => void;
  /** Se o dia virou, guarda o dia anterior no histórico e zera as tarefas. Devolve true se virou. */
  virarDiaSeNecessario: () => boolean;
}

const base = { status: 'pendente' as StatusTarefa, lembreteAgendado: false, calendarioAdicionado: false };

const tarefasPadrao: Tarefa[] = [
  { id: '1', icone: '💧', titulo: 'Beber água',      categoria: 'Hidratação',  horario: '08:00', ...base },
  { id: '2', icone: '🥗', titulo: 'Almoço saudável', categoria: 'Alimentação', horario: '12:00', ...base },
  { id: '3', icone: '🏃', titulo: 'Caminhar 20 min', categoria: 'Exercício',   horario: '18:00', ...base },
  { id: '4', icone: '😴', titulo: 'Dormir às 23h',   categoria: 'Sono',        horario: '23:00', ...base },
];

export const useRotinaStore = create<RotinaState>((set, get) => ({
  tarefas: tarefasPadrao,
  historicoDias: {},
  diaAtual: hojeLocal(),
  premiadasHoje: [],

  adicionarTarefa: (t) =>
    set((s) => ({
      tarefas: [...s.tarefas, { ...t, id: Date.now().toString(), ...base }],
    })),

  alternarStatus: (id) =>
    set((s) => {
      const tarefas = s.tarefas.map((t) => {
        if (t.id !== id) return t;
        const proximo: StatusTarefa =
          t.status === 'pendente' ? 'feita' :
          t.status === 'feita' ? 'pulada' : 'pendente';
        return { ...t, status: proximo };
      });
      return {
        tarefas,
        historicoDias: { ...s.historicoDias, [s.diaAtual]: calcularStatusDia(tarefas) },
      };
    }),

  concluir: (id) =>
    set((s) => {
      const tarefas = s.tarefas.map((t) => (t.id === id ? { ...t, status: 'feita' as StatusTarefa } : t));
      return {
        tarefas,
        historicoDias: { ...s.historicoDias, [s.diaAtual]: calcularStatusDia(tarefas) },
      };
    }),

  definirStatus: (id, status) =>
    set((s) => {
      const tarefas = s.tarefas.map((t) => (t.id === id ? { ...t, status } : t));
      return {
        tarefas,
        historicoDias: { ...s.historicoDias, [s.diaAtual]: calcularStatusDia(tarefas) },
      };
    }),

  marcarPremiada: (id) =>
    set((s) => (s.premiadasHoje.includes(id) ? s : { premiadasHoje: [...s.premiadasHoje, id] })),

  marcarLembrete: (id, valor) =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => t.id === id ? { ...t, lembreteAgendado: valor } : t),
    })),

  marcarCalendario: (id, valor) =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => t.id === id ? { ...t, calendarioAdicionado: valor } : t),
    })),

  removerTarefa: (id) =>
    set((s) => {
      const tarefas = s.tarefas.filter((t) => t.id !== id);
      return { tarefas, historicoDias: { ...s.historicoDias, [s.diaAtual]: calcularStatusDia(tarefas) } };
    }),

  resetarDia: () =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => ({ ...t, status: 'pendente' as StatusTarefa })),
      premiadasHoje: [],
    })),

  registrarDiaNoHistorico: () =>
    set((s) => ({
      historicoDias: { ...s.historicoDias, [s.diaAtual]: calcularStatusDia(s.tarefas) },
    })),

  virarDiaSeNecessario: () => {
    const hoje = hojeLocal();
    if (get().diaAtual === hoje) return false;
    set((s) => virarDia(s, hoje));
    return true;
  },
}));

// ── Hidratação manual (compatível com Expo web + native) ──────────────────────

const STORAGE_KEY = 'plim-rotina-store';

/** Fica true quando o que estava salvo no aparelho já foi carregado. */
export let rotinaCarregada = false;

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      if (saved?.tarefas || saved?.historicoDias) {
        const historicoDias: Record<string, StatusDia> = saved.historicoDias ?? {};
        // Dados antigos não guardavam o dia: assume o último dia com registro.
        const diaSalvo: string = saved.diaAtual ?? Object.keys(historicoDias).sort().pop() ?? '';
        const estado = {
          tarefas: (saved.tarefas ?? tarefasPadrao) as Tarefa[],
          historicoDias,
          diaAtual: diaSalvo,
          premiadasHoje: Array.isArray(saved.premiadasHoje) ? saved.premiadasHoje as string[] : [],
        };
        const hoje = hojeLocal();
        useRotinaStore.setState(estado.diaAtual === hoje ? estado : virarDia(estado, hoje));
      }
    } catch {}
  }
  rotinaCarregada = true;
}).catch(() => { rotinaCarregada = true; });

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useRotinaStore.subscribe((state) => {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tarefas: state.tarefas,
        historicoDias: state.historicoDias,
        diaAtual: state.diaAtual,
        premiadasHoje: state.premiadasHoje,
      }),
    ).catch(() => {});
  }, 400);
});

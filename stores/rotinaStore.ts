import { create } from 'zustand';

export type StatusTarefa = 'pendente' | 'feita' | 'pulada';
export type StatusDia = 'vazia' | 'parcial' | 'completa';

export interface Tarefa {
  id: string;
  icone: string;
  titulo: string;
  categoria: string;
  horario: string;
  status: StatusTarefa;
  lembreteAgendado: boolean;
  calendarioAdicionado: boolean;
}

interface RotinaState {
  tarefas: Tarefa[];
  historicoDias: Record<string, StatusDia>; // 'YYYY-MM-DD' → status
  adicionarTarefa: (t: Omit<Tarefa, 'id' | 'status' | 'lembreteAgendado' | 'calendarioAdicionado'>) => void;
  alternarStatus: (id: string) => void;
  marcarLembrete: (id: string, valor: boolean) => void;
  marcarCalendario: (id: string, valor: boolean) => void;
  removerTarefa: (id: string) => void;
  resetarDia: () => void;
  registrarDiaNoHistorico: () => void;
}

const base = { status: 'pendente' as StatusTarefa, lembreteAgendado: false, calendarioAdicionado: false };

const tarefasPadrao: Tarefa[] = [
  { id: '1', icone: '💧', titulo: 'Beber água',      categoria: 'Hidratação',  horario: '08:00', ...base },
  { id: '2', icone: '🥗', titulo: 'Almoço saudável', categoria: 'Alimentação', horario: '12:00', ...base },
  { id: '3', icone: '🏃', titulo: 'Caminhar 20 min', categoria: 'Exercício',   horario: '18:00', ...base },
  { id: '4', icone: '😴', titulo: 'Dormir às 23h',   categoria: 'Sono',        horario: '23:00', ...base },
];

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function calcularStatusDia(tarefas: Tarefa[]): StatusDia {
  if (tarefas.length === 0) return 'vazia';
  const feitas = tarefas.filter((t) => t.status === 'feita').length;
  if (feitas === 0) return 'vazia';
  if (feitas === tarefas.length) return 'completa';
  return 'parcial';
}

export const useRotinaStore = create<RotinaState>((set) => ({
  tarefas: tarefasPadrao,
  historicoDias: {},

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
        historicoDias: { ...s.historicoDias, [hoje()]: calcularStatusDia(tarefas) },
      };
    }),

  marcarLembrete: (id, valor) =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => t.id === id ? { ...t, lembreteAgendado: valor } : t),
    })),

  marcarCalendario: (id, valor) =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => t.id === id ? { ...t, calendarioAdicionado: valor } : t),
    })),

  removerTarefa: (id) =>
    set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) })),

  resetarDia: () =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => ({ ...t, status: 'pendente' as StatusTarefa })),
    })),

  registrarDiaNoHistorico: () =>
    set((s) => ({
      historicoDias: {
        ...s.historicoDias,
        [hoje()]: calcularStatusDia(s.tarefas),
      },
    })),
}));

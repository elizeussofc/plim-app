import { create } from 'zustand';

export type StatusTarefa = 'pendente' | 'feita' | 'pulada';

export interface Tarefa {
  id: string;
  icone: string;
  titulo: string;
  categoria: string;
  horario: string;
  status: StatusTarefa;
}

interface RotinaState {
  tarefas: Tarefa[];
  adicionarTarefa: (t: Omit<Tarefa, 'id' | 'status'>) => void;
  alternarStatus: (id: string) => void;
  removerTarefa: (id: string) => void;
  resetarDia: () => void;
}

const tarefasPadrao: Tarefa[] = [
  { id: '1', icone: '💧', titulo: 'Beber água', categoria: 'Hidratação', horario: '08:00', status: 'pendente' },
  { id: '2', icone: '🥗', titulo: 'Almoço saudável', categoria: 'Alimentação', horario: '12:00', status: 'pendente' },
  { id: '3', icone: '🏃', titulo: 'Caminhar 20 min', categoria: 'Exercício', horario: '18:00', status: 'pendente' },
  { id: '4', icone: '😴', titulo: 'Dormir às 23h', categoria: 'Sono', horario: '23:00', status: 'pendente' },
];

export const useRotinaStore = create<RotinaState>((set) => ({
  tarefas: tarefasPadrao,

  adicionarTarefa: (t) =>
    set((s) => ({
      tarefas: [
        ...s.tarefas,
        { ...t, id: Date.now().toString(), status: 'pendente' },
      ],
    })),

  alternarStatus: (id) =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => {
        if (t.id !== id) return t;
        const proximo: StatusTarefa =
          t.status === 'pendente' ? 'feita' :
          t.status === 'feita' ? 'pulada' : 'pendente';
        return { ...t, status: proximo };
      }),
    })),

  removerTarefa: (id) =>
    set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) })),

  resetarDia: () =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => ({ ...t, status: 'pendente' })),
    })),
}));

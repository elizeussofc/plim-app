import { create } from 'zustand';

export interface Desafio {
  id: string;
  icone: string;
  titulo: string;
  desc: string;
  progresso: number;
  meta: number;
  xp: number;
  moedas: number;
  completo: boolean;
  semana: number; // número da semana ISO
}

function semanaAtual(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

const DESAFIOS_BASE = [
  { id: 'tarefas_dia',  icone: '✅', titulo: '5 Tarefas num dia',    desc: 'Complete 5 tarefas em um único dia',       meta: 5,  xp: 50,  moedas: 20 },
  { id: 'calma_3x',    icone: '😌', titulo: 'Calma 3 vezes',        desc: 'Use o Modo Calma 3 vezes esta semana',     meta: 3,  xp: 30,  moedas: 15 },
  { id: 'streak_3',    icone: '🔥', titulo: 'Streak de 3 dias',     desc: 'Mantenha 3 dias seguidos de rotina',       meta: 3,  xp: 60,  moedas: 25 },
  { id: 'foco_20min',  icone: '🎯', titulo: 'Foco de 20 min',       desc: 'Complete uma sessão de foco acima de 20 min', meta: 1, xp: 40, moedas: 20 },
  { id: 'comunidade',  icone: '🤝', titulo: 'Compartilhe algo',     desc: 'Publique na comunidade esta semana',        meta: 1,  xp: 25,  moedas: 10 },
];

interface DesafiosState {
  desafios: Desafio[];
  semanaCarregada: number;
  registrarEvento: (id: string, incremento?: number) => (addXp: (n: number) => void, addMoedas: (n: number) => void) => void;
  resetarSemanaNova: () => void;
}

function criarDesafiosSemana(semana: number): Desafio[] {
  return DESAFIOS_BASE.map((d) => ({
    ...d,
    progresso: 0,
    completo: false,
    semana,
  }));
}

export const useDesafiosStore = create<DesafiosState>((set, get) => ({
  desafios: criarDesafiosSemana(semanaAtual()),
  semanaCarregada: semanaAtual(),

  registrarEvento: (id, incremento = 1) => (addXp, addMoedas) => {
    const semana = semanaAtual();
    // Reseta desafios se entrou nova semana
    if (get().semanaCarregada !== semana) {
      set({ desafios: criarDesafiosSemana(semana), semanaCarregada: semana });
    }

    set((s) => {
      const desafios = s.desafios.map((d) => {
        if (d.id !== id || d.completo) return d;
        const novoProgresso = Math.min(d.progresso + incremento, d.meta);
        const acabouDeCompletar = novoProgresso >= d.meta && !d.completo;
        if (acabouDeCompletar) {
          addXp(d.xp);
          addMoedas(d.moedas);
        }
        return { ...d, progresso: novoProgresso, completo: novoProgresso >= d.meta };
      });
      return { desafios };
    });
  },

  resetarSemanaNova: () =>
    set({ desafios: criarDesafiosSemana(semanaAtual()), semanaCarregada: semanaAtual() }),
}));

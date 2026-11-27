import AsyncStorage from '@react-native-async-storage/async-storage';
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
  semana: number; // número da semana do ano
}

function semanaAtual(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

const DESAFIOS_BASE = [
  { id: 'tarefas_dia',  icone: '✅', titulo: '5 tarefas feitas',       desc: 'Complete 5 tarefas da rotina nesta semana',   meta: 5,  xp: 50,  moedas: 20 },
  { id: 'calma_3x',     icone: '😌', titulo: 'Calma 3 vezes',          desc: 'Use o Modo Calma 3 vezes esta semana',        meta: 3,  xp: 30,  moedas: 15 },
  { id: 'streak_3',     icone: '🔥', titulo: '3 dias seguidos',        desc: 'Faça pelo menos uma tarefa por 3 dias seguidos', meta: 3, xp: 60, moedas: 25 },
  { id: 'foco_20min',   icone: '🎯', titulo: 'Foco de 20 min',         desc: 'Complete uma sessão de foco de 20 min ou mais', meta: 1, xp: 40, moedas: 20 },
  { id: 'comunidade',   icone: '🤝', titulo: 'Compartilhe algo',       desc: 'Publique no Grupo esta semana',               meta: 1,  xp: 25,  moedas: 10 },
];

type Premiar = (n: number) => void;

interface DesafiosState {
  desafios: Desafio[];
  semanaCarregada: number;
  registrarEvento: (id: string, incremento?: number) => (addXp: Premiar, addMoedas: Premiar) => void;
  /** Define o progresso de um desafio medido de fora (ex.: dias seguidos). Só sobe, nunca desce. */
  definirProgresso: (id: string, valor: number) => (addXp: Premiar, addMoedas: Premiar) => void;
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

/** Junta o que estava salvo com a lista atual de desafios (títulos e metas vêm do código). */
function reconciliar(salvos: Desafio[], semana: number): Desafio[] {
  return DESAFIOS_BASE.map((d) => {
    const s = salvos.find((x) => x.id === d.id);
    const progresso = Math.min(Math.max(0, s?.progresso ?? 0), d.meta);
    return { ...d, progresso, completo: s?.completo === true || progresso >= d.meta, semana };
  });
}

export const useDesafiosStore = create<DesafiosState>((set, get) => {
  function garantirSemana() {
    const semana = semanaAtual();
    if (get().semanaCarregada !== semana) {
      set({ desafios: criarDesafiosSemana(semana), semanaCarregada: semana });
    }
  }

  function aplicar(id: string, calcular: (d: Desafio) => number, addXp: Premiar, addMoedas: Premiar) {
    garantirSemana();
    let premio: Desafio | null = null;
    set((s) => ({
      desafios: s.desafios.map((d) => {
        if (d.id !== id || d.completo) return d;
        const novo = Math.min(Math.max(d.progresso, calcular(d)), d.meta);
        if (novo === d.progresso) return d;
        const completo = novo >= d.meta;
        if (completo) premio = d;
        return { ...d, progresso: novo, completo };
      }),
    }));
    // O prêmio sai depois do set para não disparar outra atualização no meio desta.
    if (premio) {
      addXp((premio as Desafio).xp);
      addMoedas((premio as Desafio).moedas);
    }
  }

  return {
    desafios: criarDesafiosSemana(semanaAtual()),
    semanaCarregada: semanaAtual(),

    registrarEvento: (id, incremento = 1) => (addXp, addMoedas) =>
      aplicar(id, (d) => d.progresso + incremento, addXp, addMoedas),

    definirProgresso: (id, valor) => (addXp, addMoedas) =>
      aplicar(id, () => valor, addXp, addMoedas),

    resetarSemanaNova: () =>
      set({ desafios: criarDesafiosSemana(semanaAtual()), semanaCarregada: semanaAtual() }),
  };
});

// ── Guarda no aparelho (antes o progresso da semana se perdia ao recarregar) ──

const STORAGE_KEY = 'plim-desafios-store';

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    const semana = semanaAtual();
    if (saved?.semanaCarregada === semana && Array.isArray(saved.desafios)) {
      useDesafiosStore.setState({ desafios: reconciliar(saved.desafios, semana), semanaCarregada: semana });
    }
  } catch {}
}).catch(() => {});

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useDesafiosStore.subscribe((state) => {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ desafios: state.desafios, semanaCarregada: state.semanaCarregada }),
    ).catch(() => {});
  }, 400);
});

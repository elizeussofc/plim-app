import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { novoTopico, revisar, type Materia, type Resposta, type Sessao, type TintaMateria, type Topico } from '@/lib/estudos';

/** O cronômetro de estudo em andamento. Conta por `fimEm`, então sobrevive a fechar o app. */
export interface EstudoAtivo {
  materiaId: string | null;
  minutos: number;
  inicioEm: number;
  fimEm: number;
}

/** Estudos: matérias, tópicos para revisar e o tempo estudado. Fica guardado só neste aparelho. */
interface EstudosState {
  carregado: boolean;
  materias: Materia[];
  topicos: Topico[];
  sessoes: Sessao[];
  ativo: EstudoAtivo | null;
  /** Dia em que zerar as revisões já rendeu XP. */
  premiado: string;

  salvarMateria: (m: { nome: string; tinta: TintaMateria; prova?: string }, id?: string) => string;
  apagarMateria: (id: string) => void;
  criarTopico: (nome: string, materiaId: string, hoje: string) => void;
  apagarTopico: (id: string) => void;
  /** Responde a revisão de um tópico e agenda a próxima. */
  responder: (id: string, resposta: Resposta, hoje: string) => void;
  marcarPremiado: (hoje: string) => void;
  iniciar: (materiaId: string | null, minutos: number) => void;
  /** Fecha o cronômetro e guarda os minutos de fato estudados. Devolve os minutos. */
  encerrar: (hoje: string) => number;
  apagarTudo: () => void;
}

const novoId = (prefixo: string) => `${prefixo}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
const MAX_SESSOES = 1500;
const VAZIO = { materias: [] as Materia[], topicos: [] as Topico[], sessoes: [] as Sessao[], ativo: null as EstudoAtivo | null, premiado: '' };

export const useEstudosStore = create<EstudosState>((set, get) => ({
  carregado: false,
  ...VAZIO,

  salvarMateria: (m, id) => {
    const limpa = { nome: m.nome.trim().slice(0, 30), tinta: m.tinta, prova: m.prova || undefined };
    if (id) { set((s) => ({ materias: s.materias.map((x) => (x.id === id ? { ...x, ...limpa } : x)) })); return id; }
    const novo = novoId('m');
    set((s) => ({ materias: [...s.materias, { ...limpa, id: novo }] }));
    return novo;
  },

  apagarMateria: (id) => set((s) => ({
    materias: s.materias.filter((m) => m.id !== id),
    topicos: s.topicos.filter((t) => t.materiaId !== id),
    sessoes: s.sessoes.map((x) => (x.materiaId === id ? { ...x, materiaId: null } : x)),
  })),

  criarTopico: (nome, materiaId, hoje) => {
    if (!nome.trim()) return;
    set((s) => ({ topicos: [...s.topicos, novoTopico(novoId('t'), nome, materiaId, hoje)] }));
  },

  apagarTopico: (id) => set((s) => ({ topicos: s.topicos.filter((t) => t.id !== id) })),

  responder: (id, resposta, hoje) => set((s) => ({
    topicos: s.topicos.map((t) => (t.id === id ? revisar(t, resposta, hoje, s.materias.find((m) => m.id === t.materiaId)?.prova) : t)),
  })),

  marcarPremiado: (hoje) => set({ premiado: hoje }),

  iniciar: (materiaId, minutos) => {
    const agora = Date.now();
    set({ ativo: { materiaId, minutos, inicioEm: agora, fimEm: agora + minutos * 60_000 } });
  },

  encerrar: (hoje) => {
    const ativo = get().ativo;
    if (!ativo) return 0;
    const estudados = Math.min(ativo.minutos, Math.max(0, Math.round((Math.min(Date.now(), ativo.fimEm) - ativo.inicioEm) / 60_000)));
    set((s) => ({
      ativo: null,
      sessoes: estudados > 0 ? [{ id: novoId('s'), materiaId: ativo.materiaId, data: hoje, minutos: estudados }, ...s.sessoes].slice(0, MAX_SESSOES) : s.sessoes,
    }));
    return estudados;
  },

  apagarTudo: () => set({ ...VAZIO }),
}));

const STORAGE_KEY = 'plim-estudos-store';

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        useEstudosStore.setState({
          materias: Array.isArray(s.materias) ? s.materias : [],
          topicos: Array.isArray(s.topicos) ? s.topicos : [],
          sessoes: Array.isArray(s.sessoes) ? s.sessoes : [],
          ativo: s.ativo && typeof s.ativo.fimEm === 'number' ? s.ativo : null,
          premiado: typeof s.premiado === 'string' ? s.premiado : '',
        });
      }
    } catch {}
  }
  useEstudosStore.setState({ carregado: true });
}).catch(() => { useEstudosStore.setState({ carregado: true }); });

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useEstudosStore.subscribe((s) => {
  if (!s.carregado) return; // nada de gravar por cima antes de ler
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const { materias, topicos, sessoes, ativo, premiado } = s;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ materias, topicos, sessoes, ativo, premiado })).catch(() => {});
  }, 300);
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { COMODOS_PRONTOS, puxarDoCardapio, type Cardapio, type Comodo, type ItemDaLista, type TarefaCasa } from '@/lib/casa';

/** Casa: cômodos, tarefas, cardápio e lista de mercado. Fica guardado só neste aparelho. */
interface CasaState {
  carregado: boolean;
  comodos: Comodo[];
  tarefas: TarefaCasa[];
  cardapio: Cardapio;
  /** Segunda-feira da semana a que o cardápio se refere. */
  semana: string;
  lista: ItemDaLista[];
  /** Quantas vezes a pessoa pediu sugestão: muda o sorteio do cardápio. */
  sorteio: number;

  /** Adiciona um cômodo pronto (com as tarefas dele) ou um cômodo em branco. */
  adicionarComodo: (c: { pronto: string } | { nome: string }) => string;
  apagarComodo: (id: string) => void;
  salvarTarefa: (t: { comodoId: string; nome: string; cadaDias: number; minutos: number }, id?: string) => void;
  apagarTarefa: (id: string) => void;
  /** Marca a tarefa como feita hoje; chamar de novo no mesmo dia desfaz. Devolve true se ficou feita. */
  fazerTarefa: (id: string, hoje: string) => boolean;
  definirPrato: (chave: string, nome: string) => void;
  definirCardapio: (c: Cardapio) => void;
  /** Semana nova: guarda a segunda-feira e zera o cardápio. */
  virarSemana: (segunda: string) => void;
  adicionarItem: (nome: string) => void;
  alternarItem: (id: string) => void;
  apagarItem: (id: string) => void;
  puxar: (ingredientes: string[]) => number;
  /** Tira da lista o que já foi marcado. */
  limparMarcados: () => void;
  apagarTudo: () => void;
}

const novoId = (prefixo: string) => `${prefixo}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
const VAZIO = { comodos: [] as Comodo[], tarefas: [] as TarefaCasa[], cardapio: {} as Cardapio, semana: '', lista: [] as ItemDaLista[], sorteio: 1 };
/** Guarda o `ultima` anterior de cada tarefa feita hoje, para o "desfazer" devolver o que era. */
const anteriores = new Map<string, string | undefined>();

export const useCasaStore = create<CasaState>((set, get) => ({
  carregado: false,
  ...VAZIO,

  adicionarComodo: (c) => {
    const id = novoId('c');
    if ('pronto' in c) {
      const modelo = COMODOS_PRONTOS.find((m) => m.id === c.pronto);
      if (!modelo) return '';
      set((s) => ({
        comodos: [...s.comodos, { id, nome: modelo.nome, icone: modelo.icone }],
        tarefas: [...s.tarefas, ...modelo.tarefas.map((t, i) => ({ ...t, id: `${id}-t${i}`, comodoId: id }))],
      }));
    } else {
      set((s) => ({ comodos: [...s.comodos, { id, nome: c.nome.trim().slice(0, 24) || 'Cômodo', icone: 'casa-vassoura' }] }));
    }
    return id;
  },

  apagarComodo: (id) => set((s) => ({ comodos: s.comodos.filter((c) => c.id !== id), tarefas: s.tarefas.filter((t) => t.comodoId !== id) })),

  salvarTarefa: (t, id) => set((s) => {
    const limpa = { comodoId: t.comodoId, nome: t.nome.trim().slice(0, 50), cadaDias: Math.min(90, Math.max(1, Math.round(t.cadaDias))), minutos: Math.min(120, Math.max(1, Math.round(t.minutos))) };
    if (id) return { tarefas: s.tarefas.map((x) => (x.id === id ? { ...x, ...limpa } : x)) };
    return { tarefas: [...s.tarefas, { ...limpa, id: novoId('t') }] };
  }),

  apagarTarefa: (id) => set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) })),

  fazerTarefa: (id, hoje) => {
    const tarefa = get().tarefas.find((t) => t.id === id);
    if (!tarefa) return false;
    const desfazer = tarefa.ultima === hoje;
    if (!desfazer) anteriores.set(id, tarefa.ultima);
    const ultima = desfazer ? anteriores.get(id) : hoje;
    set((s) => ({ tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, ultima } : t)) }));
    return !desfazer;
  },

  definirPrato: (chave, nome) => set((s) => {
    const cardapio = { ...s.cardapio };
    if (nome.trim()) cardapio[chave] = nome.trim().slice(0, 50); else delete cardapio[chave];
    return { cardapio };
  }),

  definirCardapio: (cardapio) => set((s) => ({ cardapio, sorteio: s.sorteio + 1 })),

  virarSemana: (segunda) => set((s) => (s.semana === segunda ? s : { semana: segunda, cardapio: s.semana ? {} : s.cardapio })),

  adicionarItem: (nome) => {
    const limpo = nome.trim().slice(0, 40);
    if (!limpo) return;
    set((s) => (s.lista.some((i) => i.nome.toLowerCase() === limpo.toLowerCase() && !i.marcado) ? s : { lista: [...s.lista, { id: novoId('i'), nome: limpo, marcado: false, doCardapio: false }] }));
  },

  alternarItem: (id) => set((s) => ({ lista: s.lista.map((i) => (i.id === id ? { ...i, marcado: !i.marcado } : i)) })),

  apagarItem: (id) => set((s) => ({ lista: s.lista.filter((i) => i.id !== id) })),

  puxar: (ingredientes) => {
    const antes = get().lista.length;
    const lista = puxarDoCardapio(get().lista, ingredientes, () => novoId('i'));
    set({ lista });
    return Math.max(0, lista.length - antes);
  },

  limparMarcados: () => set((s) => ({ lista: s.lista.filter((i) => !i.marcado) })),

  apagarTudo: () => set({ ...VAZIO }),
}));

const STORAGE_KEY = 'plim-casa-store';

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        useCasaStore.setState({
          comodos: Array.isArray(s.comodos) ? s.comodos : [],
          tarefas: Array.isArray(s.tarefas) ? s.tarefas : [],
          cardapio: s.cardapio && typeof s.cardapio === 'object' ? s.cardapio : {},
          semana: typeof s.semana === 'string' ? s.semana : '',
          lista: Array.isArray(s.lista) ? s.lista : [],
          sorteio: Number(s.sorteio) || 1,
        });
      }
    } catch {}
  }
  useCasaStore.setState({ carregado: true });
}).catch(() => { useCasaStore.setState({ carregado: true }); });

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useCasaStore.subscribe((s) => {
  if (!s.carregado) return; // nada de gravar por cima antes de ler
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const { comodos, tarefas, cardapio, semana, lista, sorteio } = s;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ comodos, tarefas, cardapio, semana, lista, sorteio })).catch(() => {});
  }, 300);
});

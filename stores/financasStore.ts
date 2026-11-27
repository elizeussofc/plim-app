import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Bem, Conta, Divida, Lancamento, Meta, Renda } from '@/lib/financas';

/**
 * Finanças: tudo fica guardado só neste aparelho. Nada de dinheiro da pessoa vai para o servidor.
 */
interface FinancasState {
  carregado: boolean;
  lancamentos: Lancamento[];
  contas: Conta[];
  metas: Meta[];
  dividas: Divida[];
  bens: Bem[];
  /** Teto de gasto por categoria, em centavos. */
  tetos: Record<string, number>;
  perfil: { renda: Renda; sustentaSozinho: boolean };

  anotar: (l: Omit<Lancamento, 'id'>, id?: string) => string;
  apagarLancamento: (id: string) => void;
  salvarConta: (c: Omit<Conta, 'id' | 'pagas'>, id?: string) => void;
  apagarConta: (id: string) => void;
  /** Marca a conta como paga no mês e anota o gasto; desmarcar tira o gasto. */
  pagarConta: (id: string, mes: string, data: string, paga: boolean) => void;
  salvarMeta: (m: Omit<Meta, 'id' | 'guardado'>, id?: string) => string;
  apagarMeta: (id: string) => void;
  /** Guarda (ou tira, com valor negativo) dinheiro numa meta. Devolve true se a meta foi batida agora. */
  guardar: (id: string, valor: number, data: string) => boolean;
  definirTeto: (categoria: string, valor: number) => void;
  salvarDivida: (d: Omit<Divida, 'id'>, id?: string) => void;
  apagarDivida: (id: string) => void;
  salvarBem: (b: Omit<Bem, 'id'>, id?: string) => void;
  apagarBem: (id: string) => void;
  definirPerfil: (p: Partial<FinancasState['perfil']>) => void;
  apagarTudo: () => void;
}

const novoId = (prefixo: string) => `${prefixo}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
const MAX_LANCAMENTOS = 3000;
const VAZIO = { lancamentos: [], contas: [], metas: [], dividas: [], bens: [], tetos: {}, perfil: { renda: 'fixa' as Renda, sustentaSozinho: false } };

export const useFinancasStore = create<FinancasState>((set, get) => ({
  carregado: false,
  ...VAZIO,

  anotar: (l, id) => {
    const novo: Lancamento = { ...l, valor: Math.max(0, Math.round(l.valor)), descricao: l.descricao.trim().slice(0, 60), id: id ?? novoId('l') };
    set((s) => ({ lancamentos: [novo, ...s.lancamentos.filter((x) => x.id !== novo.id)].slice(0, MAX_LANCAMENTOS) }));
    return novo.id;
  },

  apagarLancamento: (id) => set((s) => ({ lancamentos: s.lancamentos.filter((l) => l.id !== id) })),

  salvarConta: (c, id) => set((s) => {
    const limpa = { nome: c.nome.trim().slice(0, 40), valor: Math.max(0, Math.round(c.valor)), dia: Math.min(31, Math.max(1, Math.round(c.dia))), categoria: c.categoria };
    if (id) return { contas: s.contas.map((x) => (x.id === id ? { ...x, ...limpa } : x)) };
    return { contas: [...s.contas, { ...limpa, id: novoId('c'), pagas: {} }] };
  }),

  apagarConta: (id) => set((s) => ({ contas: s.contas.filter((c) => c.id !== id) })),

  pagarConta: (id, mes, data, paga) => {
    const conta = get().contas.find((c) => c.id === id);
    if (!conta) return;
    const idLancamento = `conta-${id}-${mes}`;
    set((s) => ({
      contas: s.contas.map((c) => {
        if (c.id !== id) return c;
        const pagas = { ...c.pagas };
        if (paga) pagas[mes] = true; else delete pagas[mes];
        return { ...c, pagas };
      }),
      lancamentos: s.lancamentos.filter((l) => l.id !== idLancamento),
    }));
    if (paga) get().anotar({ tipo: 'gasto', valor: conta.valor, categoria: conta.categoria, descricao: conta.nome, data }, idLancamento);
  },

  salvarMeta: (m, id) => {
    const limpa = { nome: m.nome.trim().slice(0, 40), alvo: Math.max(0, Math.round(m.alvo)), prazo: m.prazo, reserva: m.reserva };
    if (id) { set((s) => ({ metas: s.metas.map((x) => (x.id === id ? { ...x, ...limpa } : x)) })); return id; }
    const novo = novoId('m');
    // A reserva de emergência fica sempre no topo.
    set((s) => ({ metas: limpa.reserva ? [{ ...limpa, id: novo, guardado: 0 }, ...s.metas] : [...s.metas, { ...limpa, id: novo, guardado: 0 }] }));
    return novo;
  },

  apagarMeta: (id) => set((s) => ({ metas: s.metas.filter((m) => m.id !== id) })),

  guardar: (id, valor, data) => {
    const meta = get().metas.find((m) => m.id === id);
    if (!meta) return false;
    const depois = Math.max(0, meta.guardado + Math.round(valor));
    const movido = depois - meta.guardado;
    if (movido === 0) return false;
    set((s) => ({ metas: s.metas.map((m) => (m.id === id ? { ...m, guardado: depois } : m)) }));
    // Guardar sai do saldo do mês como "Guardei"; tirar da meta volta como ganho.
    if (movido > 0) get().anotar({ tipo: 'gasto', valor: movido, categoria: 'guardado', descricao: meta.nome, data });
    else get().anotar({ tipo: 'ganho', valor: -movido, categoria: 'outros-ganhos', descricao: `Tirei de ${meta.nome}`, data });
    return meta.alvo > 0 && meta.guardado < meta.alvo && depois >= meta.alvo;
  },

  definirTeto: (categoria, valor) => set((s) => {
    const tetos = { ...s.tetos };
    if (valor > 0) tetos[categoria] = Math.round(valor); else delete tetos[categoria];
    return { tetos };
  }),

  salvarDivida: (d, id) => set((s) => {
    const limpa = { nome: d.nome.trim().slice(0, 40), saldo: Math.max(0, Math.round(d.saldo)), jurosMes: Math.min(30, Math.max(0, d.jurosMes)), minimo: Math.max(0, Math.round(d.minimo)) };
    if (id) return { dividas: s.dividas.map((x) => (x.id === id ? { ...x, ...limpa } : x)) };
    return { dividas: [...s.dividas, { ...limpa, id: novoId('d') }] };
  }),

  apagarDivida: (id) => set((s) => ({ dividas: s.dividas.filter((d) => d.id !== id) })),

  salvarBem: (b, id) => set((s) => {
    const limpo = { nome: b.nome.trim().slice(0, 40), valor: Math.max(0, Math.round(b.valor)) };
    if (id) return { bens: s.bens.map((x) => (x.id === id ? { ...x, ...limpo } : x)) };
    return { bens: [...s.bens, { ...limpo, id: novoId('b') }] };
  }),

  apagarBem: (id) => set((s) => ({ bens: s.bens.filter((b) => b.id !== id) })),

  definirPerfil: (p) => set((s) => ({ perfil: { ...s.perfil, ...p } })),

  apagarTudo: () => set({ ...VAZIO }),
}));

const STORAGE_KEY = 'plim-financas-store';

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        useFinancasStore.setState({
          lancamentos: Array.isArray(s.lancamentos) ? s.lancamentos : [],
          contas: Array.isArray(s.contas) ? s.contas : [],
          metas: Array.isArray(s.metas) ? s.metas : [],
          dividas: Array.isArray(s.dividas) ? s.dividas : [],
          bens: Array.isArray(s.bens) ? s.bens : [],
          tetos: s.tetos && typeof s.tetos === 'object' ? s.tetos : {},
          perfil: { renda: s.perfil?.renda === 'variavel' ? 'variavel' : 'fixa', sustentaSozinho: !!s.perfil?.sustentaSozinho },
        });
      }
    } catch {}
  }
  useFinancasStore.setState({ carregado: true });
}).catch(() => { useFinancasStore.setState({ carregado: true }); });

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useFinancasStore.subscribe((s) => {
  if (!s.carregado) return; // nada de gravar por cima antes de ler
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const { lancamentos, contas, metas, dividas, bens, tetos, perfil } = s;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ lancamentos, contas, metas, dividas, bens, tetos, perfil })).catch(() => {});
  }, 300);
});

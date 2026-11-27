import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { PERFIL_PADRAO, RITUAL_PADRAO, type Noite, type PassoRitual, type PerfilSono } from '@/lib/sono';

/** Sono: meta, ritual de desligar e o diário das noites. Fica guardado só neste aparelho. */
interface SonoState {
  carregado: boolean;
  perfil: PerfilSono;
  /** A pessoa já escolheu a meta? Antes disso a tela mostra a meta padrão como sugestão. */
  metaDefinida: boolean;
  ritual: PassoRitual[];
  /** Passos do ritual marcados, e de que dia são. */
  feitos: { data: string; ids: string[] };
  /** Dia em que o ritual completo já rendeu XP. */
  premiado: string;
  noites: Noite[];
  /** Lembrete diário na hora de desligar (só no celular). */
  lembrete: boolean;

  definirLembrete: (ligado: boolean) => void;
  definirPerfil: (p: PerfilSono) => void;
  /** Marca ou desmarca um passo. Devolve true quando o ritual acabou de ficar completo. */
  alternarPasso: (id: string, hoje: string) => boolean;
  marcarPremiado: (hoje: string) => void;
  salvarPasso: (p: Omit<PassoRitual, 'id'>, id?: string) => void;
  apagarPasso: (id: string) => void;
  restaurarRitual: () => void;
  /** Guarda a noite (uma por dia: anotar de novo substitui). */
  anotarNoite: (n: Noite) => void;
  apagarNoite: (data: string) => void;
  apagarTudo: () => void;
}

const MAX_NOITES = 400;
const VAZIO = { perfil: PERFIL_PADRAO, metaDefinida: false, ritual: RITUAL_PADRAO, feitos: { data: '', ids: [] as string[] }, premiado: '', noites: [] as Noite[], lembrete: false };

export const useSonoStore = create<SonoState>((set, get) => ({
  carregado: false,
  ...VAZIO,

  definirLembrete: (lembrete) => set({ lembrete }),

  definirPerfil: (p) => set({ perfil: { acordar: p.acordar, horas: Math.min(10, Math.max(5, p.horas)) }, metaDefinida: true }),

  alternarPasso: (id, hoje) => {
    const { feitos, ritual } = get();
    const atuais = feitos.data === hoje ? feitos.ids : [];
    const ids = atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id];
    set({ feitos: { data: hoje, ids } });
    const antes = ritual.length > 0 && ritual.every((p) => atuais.includes(p.id));
    return !antes && ritual.length > 0 && ritual.every((p) => ids.includes(p.id));
  },

  marcarPremiado: (hoje) => set({ premiado: hoje }),

  salvarPasso: (p, id) => set((s) => {
    const limpo = { nome: p.nome.trim().slice(0, 50), minutos: Math.min(60, Math.max(1, Math.round(p.minutos))), rota: p.rota };
    if (id) return { ritual: s.ritual.map((x) => (x.id === id ? { ...x, ...limpo } : x)) };
    return { ritual: [...s.ritual, { ...limpo, id: `p-${Date.now().toString(36)}` }] };
  }),

  apagarPasso: (id) => set((s) => ({ ritual: s.ritual.filter((p) => p.id !== id) })),

  restaurarRitual: () => set({ ritual: RITUAL_PADRAO }),

  anotarNoite: (n) => set((s) => ({
    noites: [n, ...s.noites.filter((x) => x.data !== n.data)].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, MAX_NOITES),
  })),

  apagarNoite: (data) => set((s) => ({ noites: s.noites.filter((n) => n.data !== data) })),

  apagarTudo: () => set({ ...VAZIO }),
}));

const STORAGE_KEY = 'plim-sono-store';

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        useSonoStore.setState({
          perfil: s.perfil?.acordar ? { acordar: String(s.perfil.acordar), horas: Number(s.perfil.horas) || 8 } : PERFIL_PADRAO,
          metaDefinida: !!s.metaDefinida,
          ritual: Array.isArray(s.ritual) && s.ritual.length ? s.ritual : RITUAL_PADRAO,
          feitos: s.feitos?.data ? { data: String(s.feitos.data), ids: Array.isArray(s.feitos.ids) ? s.feitos.ids : [] } : VAZIO.feitos,
          premiado: typeof s.premiado === 'string' ? s.premiado : '',
          noites: Array.isArray(s.noites) ? s.noites : [],
          lembrete: !!s.lembrete,
        });
      }
    } catch {}
  }
  useSonoStore.setState({ carregado: true });
}).catch(() => { useSonoStore.setState({ carregado: true }); });

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useSonoStore.subscribe((s) => {
  if (!s.carregado) return; // nada de gravar por cima antes de ler
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const { perfil, metaDefinida, ritual, feitos, premiado, noites, lembrete } = s;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ perfil, metaDefinida, ritual, feitos, premiado, noites, lembrete })).catch(() => {});
  }, 300);
});

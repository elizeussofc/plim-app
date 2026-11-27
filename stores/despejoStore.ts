import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { hojeLocal } from '@/lib/dia';

/**
 * Despejos mentais guardados no aparelho.
 * Antes o botão "Salvar" dava XP e jogava o texto fora; agora o texto fica aqui,
 * só neste aparelho (não vai para a nuvem: é o lugar de escrever sem filtro).
 */
export interface Despejo {
  id: string;
  texto: string;
  criadoEm: string; // ISO
}

interface DespejoState {
  despejos: Despejo[];
  /** Último dia em que o despejo deu XP (um prêmio por dia). */
  premiadoEm: string;
  /** Guarda o texto. Devolve true se este foi o despejo premiado do dia. */
  salvar: (texto: string) => boolean;
  remover: (id: string) => void;
}

const LIMITE = 100;

export const useDespejoStore = create<DespejoState>((set, get) => ({
  despejos: [],
  premiadoEm: '',

  salvar: (texto) => {
    const hoje = hojeLocal();
    const premia = get().premiadoEm !== hoje;
    set((s) => ({
      despejos: [{ id: Date.now().toString(), texto: texto.trim(), criadoEm: new Date().toISOString() }, ...s.despejos].slice(0, LIMITE),
      premiadoEm: hoje,
    }));
    return premia;
  },

  remover: (id) => set((s) => ({ despejos: s.despejos.filter((d) => d.id !== id) })),
}));

const STORAGE_KEY = 'plim-despejo-store';

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (Array.isArray(saved?.despejos)) {
      useDespejoStore.setState({ despejos: saved.despejos, premiadoEm: typeof saved.premiadoEm === 'string' ? saved.premiadoEm : '' });
    }
  } catch {}
}).catch(() => {});

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
useDespejoStore.subscribe((state) => {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ despejos: state.despejos, premiadoEm: state.premiadoEm })).catch(() => {});
  }, 400);
});

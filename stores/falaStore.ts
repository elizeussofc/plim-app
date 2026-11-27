import { create } from 'zustand';
import { escolherFala, type Humor, type Situacao } from '@/lib/falas';
import { somBalao } from '@/lib/sons';

/**
 * O que o avatar está dizendo agora. Não é guardado no aparelho: fala é coisa do momento.
 * Qualquer parte do app chama `dizer(situacao)`; quem mostra o balão é o componente Balao.
 */
export interface FalaAtual {
  id: number;
  texto: string;
  humor: Humor;
  situacao: Situacao;
  criadaEm: number;
}

/** Fala mais importante não é atropelada por uma menos importante logo em seguida. */
const PESO: Partial<Record<Situacao, number>> = {
  nivel: 5, rotina_completa: 5, missao_ok: 5, missao_falhou: 5, missao_teto: 5,
  sequencia_3: 4, sequencia_7: 4, sequencia_longa: 4, conquista: 4,
  desafio: 3, falta_uma: 3, primeira_tarefa: 3, foco_completo: 3, voltou: 3, sequencia_quebrou: 3,
  toque: 1, toque_demais: 1,
  manha_zero: 1, tarde_zero: 1, noite_zero: 1, madrugada: 1, em_andamento: 1, noite_pendente: 1, sem_rotina: 1,
};
const peso = (s: Situacao) => PESO[s] ?? 2;
const JANELA_MS = 2500;

interface FalaState {
  fala: FalaAtual | null;
  ligadas: boolean;
  dizer: (situacao: Situacao) => void;
  calar: () => void;
  configurar: (ligadas: boolean) => void;
}

let contador = 0;
let ultimoTexto: string | undefined;

export const useFalaStore = create<FalaState>((set, get) => ({
  fala: null,
  ligadas: true,

  dizer: (situacao) => {
    if (!get().ligadas) return;
    const atual = get().fala;
    const agora = Date.now();
    if (atual && agora - atual.criadaEm < JANELA_MS && peso(situacao) < peso(atual.situacao)) return;
    const escolhida = escolherFala(situacao, ultimoTexto);
    ultimoTexto = escolhida.texto;
    set({ fala: { id: ++contador, texto: escolhida.texto, humor: escolhida.humor, situacao, criadaEm: agora } });
    somBalao();
  },

  calar: () => set({ fala: null }),

  configurar: (ligadas) => set(ligadas ? { ligadas } : { ligadas, fala: null }),
}));

/** Atalho para chamar de fora de componente. */
export function dizer(situacao: Situacao) {
  useFalaStore.getState().dizer(situacao);
}

import { create } from 'zustand';

export interface Medicacao {
  id: string;
  nome: string;
  dose: string;
  horario: string;
  cor: string;
  ativo: boolean;
}

interface MedicacaoState {
  medicacoes: Medicacao[];
  registros: Record<string, boolean>; // key: `${data}_${id}`
  adicionarMedicacao: (m: Omit<Medicacao, 'id' | 'ativo'>) => void;
  removerMedicacao: (id: string) => void;
  marcarTomada: (id: string, data: string) => void;
  desmarcarTomada: (id: string, data: string) => void;
  foiTomada: (id: string, data: string) => boolean;
}

const COR_OPCOES = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2'];

export { COR_OPCOES };

export const useMedicacaoStore = create<MedicacaoState>((set, get) => ({
  medicacoes: [],
  registros: {},

  adicionarMedicacao: (m) =>
    set((s) => ({
      medicacoes: [
        ...s.medicacoes,
        { ...m, id: Date.now().toString(), ativo: true },
      ],
    })),

  removerMedicacao: (id) =>
    set((s) => ({
      medicacoes: s.medicacoes.filter((m) => m.id !== id),
    })),

  marcarTomada: (id, data) =>
    set((s) => ({ registros: { ...s.registros, [`${data}_${id}`]: true } })),

  desmarcarTomada: (id, data) =>
    set((s) => {
      const r = { ...s.registros };
      delete r[`${data}_${id}`];
      return { registros: r };
    }),

  foiTomada: (id, data) => !!get().registros[`${data}_${id}`],
}));

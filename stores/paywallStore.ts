import { create } from 'zustand';

interface PaywallState {
  visivel: boolean;
  origem: string | null;
  abrir: (origem?: string) => void;
  fechar: () => void;
}

export const usePaywallStore = create<PaywallState>((set) => ({
  visivel: false,
  origem: null,
  abrir: (origem) => set({ visivel: true, origem: origem ?? null }),
  fechar: () => set({ visivel: false, origem: null }),
}));

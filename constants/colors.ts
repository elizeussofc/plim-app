export const Colors = {
  primary: {
    50:  '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
  },
  energy: {
    light: '#FFF7ED',
    main:  '#F97316',
    dark:  '#EA580C',
  },
  calm: {
    light: '#F0F9FF',
    main:  '#0EA5E9',
    dark:  '#0284C7',
  },
  success: {
    light: '#ECFDF5',
    main:  '#10B981',
    dark:  '#059669',
  },
  // Sem vermelho para erros — usamos âmbar
  warning: {
    light: '#FFFBEB',
    main:  '#F59E0B',
    dark:  '#D97706',
  },
  surface:    '#FFFFFF',
  background: '#F5F3FF',
  text: {
    primary:   '#1E293B',
    secondary: '#64748B',
    muted:     '#94A3B8',
    inverse:   '#FFFFFF',
  },
  // Modo escuro
  dark: {
    background: '#0F0A1E',
    surface:    '#1A1033',
    surface2:   '#231647',
    text:       '#F1F5F9',
    muted:      '#64748B',
  },
  // Categorias de tarefas
  categories: {
    saude:      '#10B981',
    hidratacao: '#0EA5E9',
    alimentacao:'#F97316',
    exercicio:  '#8B5CF6',
    estudo:     '#6D28D9',
    trabalho:   '#1E40AF',
    sono:       '#4C1D95',
    social:     '#EC4899',
    lazer:      '#F59E0B',
    geral:      '#94A3B8',
  },
} as const;

/**
 * Identidade "massinha" do Plim (nov/2026).
 * Tudo no app parece feito do mesmo material do avatar: fundo de papel creme,
 * peças brancas e gordinhas com uma borda mais grossa embaixo (como um brinquedo
 * que dá para apertar), roxo e laranja do moletom, e ícones de massinha.
 *
 * As chaves antigas (glass, primaryLight, borderPrimary...) continuam existindo
 * para as telas que já as usam; só os valores mudaram.
 */
export const C = {
  // Fundos
  bg:           '#FBF6EE', // papel creme
  surface:      '#FFFFFF',
  surfaceHigh:  '#F4EDE1', // rebaixo: trilhos, chips, campos

  // Bordas
  border:       '#EADFCF',
  borderBright: '#DCCDB6',
  borderPrimary:'#D9C8FB',

  // Tintas roxas suaves (antes eram "vidro" no tema escuro)
  glass:        '#F3ECFF',
  glassStrong:  '#E7DBFF',

  // Primária: roxo do moletom
  primary:      '#7C3AED',
  primaryDim:   '#5B21B6', // borda de baixo dos botões roxos
  primaryGlow:  'rgba(124,58,237,0.22)',
  primaryLight: '#6D28D9', // roxo para texto e detalhes sobre fundo claro

  // Destaque: laranja do raio
  accent:       '#EA580C',
  accentDim:    '#C2410C',
  accentSoft:   '#FFE9D6',
  accentGlow:   'rgba(234,88,12,0.20)',

  // Texto: ameixa escura, nunca preto puro
  text:         '#2B1D4E',
  textSub:      '#64577F',
  textMuted:    '#8A7FA3',
  onPrimary:    '#FFFFFF',

  // Semânticas (sem vermelho de bronca: o Plim não dá bronca)
  success:      '#0E9F6E',
  successDim:   '#0B7C56',
  successSoft:  '#DDF6EA',
  successGlow:  'rgba(14,159,110,0.20)',
  gold:         '#D97706',
  goldSoft:     '#FFF1C7',
  danger:       '#D9466A',
  dangerSoft:   '#FDE4EB',
  sky:          '#2F7FE6',
  skySoft:      '#DDECFF',
  pink:         '#DB4F93',
  pinkSoft:     '#FFE1EE',

  // Trilho de barra de progresso
  track:        '#EFE6D8',
} as const;

/** Famílias de fonte carregadas em app/_layout.tsx. */
export const F = {
  display:  'Fredoka_600SemiBold',
  displayX: 'Fredoka_700Bold',
  medium:   'Fredoka_500Medium',
  regular:  'AtkinsonHyperlegible_400Regular',
  bold:     'AtkinsonHyperlegible_700Bold',
} as const;

export const R = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 } as const;

/** Peça de massinha: borda fina em volta e mais grossa embaixo. */
export function peca(corBorda: string = C.border, fundo: string = C.surface, raio: number = R.lg) {
  return {
    backgroundColor: fundo,
    borderRadius: raio,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: corBorda,
  } as const;
}

/** Botão de apertar: cor cheia com a borda de baixo mais escura. */
export function botao(cor: string = C.primary, corBaixo: string = C.primaryDim, raio: number = R.md) {
  return {
    backgroundColor: cor,
    borderRadius: raio,
    borderBottomWidth: 5,
    borderColor: corBaixo,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  } as const;
}

/** Tinta de cada ferramenta: [fundo suave, cor forte]. */
export const TINTA = {
  roxo:    [C.glass, C.primary],
  laranja: [C.accentSoft, C.accent],
  verde:   [C.successSoft, C.success],
  azul:    [C.skySoft, C.sky],
  rosa:    [C.pinkSoft, C.pink],
  ouro:    [C.goldSoft, C.gold],
} as const;

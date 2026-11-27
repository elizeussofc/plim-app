import { Children, Fragment, type ReactNode } from 'react';
import { Image, StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { EMOJI_ICONE, EMOJI_REGEX, ICONES } from '@/components/Icone';
import { C, F } from '@/lib/theme';

/**
 * Texto do Plim. Substitui o Text do react-native em todas as telas e faz três coisas:
 *  1. escolhe a fonte: Fredoka nos títulos, Atkinson Hyperlegible no resto (feita para ler fácil);
 *  2. não deixa nenhum texto menor que 12 px;
 *  3. troca os emojis conhecidos pelos ícones de massinha, no tamanho da letra.
 */

const TAMANHO_CLASSE: Record<string, number> = {
  'text-xs': 12, 'text-sm': 14, 'text-base': 16, 'text-lg': 18, 'text-xl': 20,
  'text-2xl': 24, 'text-3xl': 30, 'text-4xl': 36, 'text-5xl': 48, 'text-6xl': 60,
};
const PESO_CLASSE: Record<string, number> = {
  'font-normal': 400, 'font-medium': 500, 'font-semibold': 600, 'font-bold': 700, 'font-extrabold': 800,
};
const TAMANHO_MINIMO = 12;
const COR_NA_CLASSE = /\btext-(white|black|transparent|[a-z]+-\d{2,3})\b/;

function lerClasses(className?: string) {
  let tamanho: number | undefined;
  let peso: number | undefined;
  if (className) {
    for (const c of className.split(/\s+/)) {
      if (TAMANHO_CLASSE[c]) tamanho = TAMANHO_CLASSE[c];
      if (PESO_CLASSE[c]) peso = PESO_CLASSE[c];
    }
  }
  return { tamanho, peso };
}

function pesoNumero(p: TextStyle['fontWeight']): number | undefined {
  if (p == null) return undefined;
  if (p === 'bold') return 700;
  if (p === 'normal') return 400;
  const n = Number(p);
  return Number.isFinite(n) ? n : undefined;
}

function comIcones(filhos: ReactNode, tamanho: number): ReactNode {
  return Children.map(filhos, (filho) => {
    if (typeof filho !== 'string') return filho;
    EMOJI_REGEX.lastIndex = 0;
    if (!EMOJI_REGEX.test(filho)) return filho;
    EMOJI_REGEX.lastIndex = 0;
    const partes: ReactNode[] = [];
    let ultimo = 0;
    let m: RegExpExecArray | null;
    const lado = Math.round(tamanho * 1.3);
    while ((m = EMOJI_REGEX.exec(filho))) {
      if (m.index > ultimo) partes.push(filho.slice(ultimo, m.index));
      const nome = EMOJI_ICONE[m[1]];
      partes.push(
        <Image
          key={`i${m.index}`}
          source={ICONES[nome]}
          style={{ width: lado, height: lado, transform: [{ translateY: Math.round(tamanho * 0.24) }] }}
          resizeMode="contain"
          accessible={false}
        />,
      );
      ultimo = m.index + m[0].length;
    }
    if (ultimo < filho.length) partes.push(filho.slice(ultimo));
    return <Fragment>{partes}</Fragment>;
  });
}

export interface TextoProps extends TextProps {
  className?: string;
  /** Força a fonte de título (Fredoka) mesmo em texto pequeno. */
  titulo?: boolean;
}

export function Text({ style, className, children, titulo, ...resto }: TextoProps) {
  const plano = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const classes = lerClasses(className);
  const tamanhoPedido = plano.fontSize ?? classes.tamanho ?? 15;
  const tamanho = Math.max(TAMANHO_MINIMO, tamanhoPedido);
  const peso = pesoNumero(plano.fontWeight) ?? classes.peso ?? 400;

  const ehTitulo = titulo || (peso >= 700 && tamanho >= 17) || (peso >= 600 && tamanho >= 20);
  const familia = plano.fontFamily
    ?? (ehTitulo ? (peso >= 800 ? F.displayX : F.display) : peso >= 600 ? F.bold : F.regular);

  const ajuste: TextStyle = { fontFamily: familia, fontWeight: 'normal' };
  if (tamanho !== tamanhoPedido || plano.fontSize == null) ajuste.fontSize = tamanho;
  // Título em Fredoka não precisa de letras apertadas; itálico de mensagem vira texto normal.
  if (ehTitulo && plano.letterSpacing != null && plano.letterSpacing < 0) ajuste.letterSpacing = 0;
  if (plano.fontStyle === 'italic') ajuste.fontStyle = 'normal';
  if (plano.color == null && !(className && COR_NA_CLASSE.test(className))) ajuste.color = C.text;

  const temString = Children.toArray(children).some((c) => typeof c === 'string');
  return (
    <RNText {...resto} className={className} style={[style, ajuste]}>
      {temString ? comIcones(children, tamanho) : children}
    </RNText>
  );
}

export default Text;

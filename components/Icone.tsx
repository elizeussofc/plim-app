import { Image, type ImageStyle, type StyleProp } from 'react-native';

/** Ícones de massinha do Plim (gerados em nov/2026). Um arquivo por ícone em assets/icones. */
export const ICONES = {
  casa: require('../assets/icones/casa.webp'),
  rotina: require('../assets/icones/rotina.webp'),
  raio: require('../assets/icones/raio.webp'),
  conversa: require('../assets/icones/conversa.webp'),
  cerebro: require('../assets/icones/cerebro.webp'),
  alvo: require('../assets/icones/alvo.webp'),
  lotus: require('../assets/icones/lotus.webp'),
  robo: require('../assets/icones/robo.webp'),
  pilula: require('../assets/icones/pilula.webp'),
  grafico: require('../assets/icones/grafico.webp'),
  parceria: require('../assets/icones/parceria.webp'),
  trofeu: require('../assets/icones/trofeu.webp'),
  chama: require('../assets/icones/chama.webp'),
  moeda: require('../assets/icones/moeda.webp'),
  estrela: require('../assets/icones/estrela.webp'),
  coroa: require('../assets/icones/coroa.webp'),
  gota: require('../assets/icones/gota.webp'),
  salada: require('../assets/icones/salada.webp'),
  tenis: require('../assets/icones/tenis.webp'),
  lua: require('../assets/icones/lua.webp'),
  livros: require('../assets/icones/livros.webp'),
  sol: require('../assets/icones/sol.webp'),
  sino: require('../assets/icones/sino.webp'),
  calendario: require('../assets/icones/calendario.webp'),
  foguete: require('../assets/icones/foguete.webp'),
  festa: require('../assets/icones/festa.webp'),
  lampada: require('../assets/icones/lampada.webp'),
  coracao: require('../assets/icones/coracao.webp'),
  forca: require('../assets/icones/forca.webp'),
  medalha: require('../assets/icones/medalha.webp'),
  cadeado: require('../assets/icones/cadeado.webp'),
  check: require('../assets/icones/check.webp'),
  'humor-1': require('../assets/icones/humor-1.webp'),
  'humor-2': require('../assets/icones/humor-2.webp'),
  'humor-3': require('../assets/icones/humor-3.webp'),
  'humor-4': require('../assets/icones/humor-4.webp'),
  'humor-5': require('../assets/icones/humor-5.webp'),
  presente: require('../assets/icones/presente.webp'),
  lapis: require('../assets/icones/lapis.webp'),
  paleta: require('../assets/icones/paleta.webp'),
  coruja: require('../assets/icones/coruja.webp'),
  onda: require('../assets/icones/onda.webp'),
  nuvem: require('../assets/icones/nuvem.webp'),
  celular: require('../assets/icones/celular.webp'),
  ampulheta: require('../assets/icones/ampulheta.webp'),
  pensamento: require('../assets/icones/pensamento.webp'),
  escudo: require('../assets/icones/escudo.webp'),
  gema: require('../assets/icones/gema.webp'),
} as const;

export type NomeIcone = keyof typeof ICONES;

/**
 * Emoji → ícone de massinha. Muitos textos e dados do app ainda guardam emoji
 * (categorias de tarefa, desafios, perfis). O componente Text troca cada emoji
 * desta lista pelo ícone correspondente; os que não estão aqui continuam emoji.
 */
export const EMOJI_ICONE: Record<string, NomeIcone> = {
  '🏠': 'casa', '📋': 'rotina', '⚡': 'raio', '💬': 'conversa', '👥': 'conversa',
  '🧠': 'cerebro', '🎯': 'alvo', '😌': 'lotus', '🧘': 'lotus', '🤖': 'robo',
  '💊': 'pilula', '📊': 'grafico', '📈': 'grafico', '👫': 'parceria', '🤝': 'parceria',
  '🏆': 'trofeu', '🔥': 'chama', '🪙': 'moeda', '✨': 'estrela', '🌟': 'estrela', '⭐': 'estrela',
  '👑': 'coroa', '💧': 'gota', '🚿': 'gota', '🥗': 'salada', '🏃': 'tenis',
  '😴': 'lua', '🌙': 'lua', '📚': 'livros', '☀': 'sol', '🌅': 'sol', '🔔': 'sino',
  '📅': 'calendario', '🚀': 'foguete', '🎉': 'festa', '💡': 'lampada',
  '🫂': 'coracao', '🥹': 'coracao', '💪': 'forca', '🥇': 'medalha', '🔒': 'cadeado', '🔐': 'cadeado',
  '✅': 'check', '😫': 'humor-1', '😵': 'humor-1', '😟': 'humor-2', '😰': 'humor-2',
  '😐': 'humor-3', '🙂': 'humor-4', '😊': 'humor-5', '🤩': 'humor-5',
  '🎁': 'presente', '✏': 'lapis', '🎨': 'paleta', '🦉': 'coruja', '🌊': 'onda',
  '☁': 'nuvem', '📱': 'celular', '⏳': 'ampulheta', '💭': 'pensamento', '🤔': 'pensamento',
};

const ESCAPE = /[.*+?^${}()|[\]\\]/g;
/** Casa qualquer emoji da lista, com ou sem o seletor de variação (U+FE0F). */
export const EMOJI_REGEX = new RegExp(
  '(' + Object.keys(EMOJI_ICONE).map((e) => e.replace(ESCAPE, '\\$&')).join('|') + ')\\uFE0F?',
  'gu',
);

interface Props {
  nome: NomeIcone;
  tamanho?: number;
  style?: StyleProp<ImageStyle>;
  /** Ícone decorativo: some para leitores de tela (o texto ao lado já diz o que é). */
  decorativo?: boolean;
  rotulo?: string;
}

export default function Icone({ nome, tamanho = 28, style, decorativo = true, rotulo }: Props) {
  return (
    <Image
      source={ICONES[nome]}
      style={[{ width: tamanho, height: tamanho }, style]}
      resizeMode="contain"
      accessible={!decorativo}
      accessibilityLabel={decorativo ? undefined : rotulo ?? nome}
      accessibilityElementsHidden={decorativo}
      importantForAccessibility={decorativo ? 'no' : 'auto'}
    />
  );
}

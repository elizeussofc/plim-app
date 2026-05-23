import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import { SvgXml } from 'react-native-svg';

export type Expressao = 'feliz' | 'neutro' | 'triste' | 'animado';

export interface AvatarConfig {
  genero: 'masculino' | 'feminino';
  skinColor: string;       // hex sem # ex: 'f2d3b1'
  hairStyle: string;       // ex: 'short05' ou 'long12'
  hairColor: string;       // hex sem #
  eyebrowsStyle: string;   // ex: 'variant01'
  features: string[];      // 'freckles' | 'blush' | 'birthmark' | 'mustache'
  earrings: boolean;
  glassesStyle: string;    // '' para nenhum, ou 'variant01'-'variant05'
  backgroundColor: string; // hex sem #
}

export const avatarConfigPadrao: AvatarConfig = {
  genero: 'masculino',
  skinColor: 'f2d3b1',
  hairStyle: 'short05',
  hairColor: '1a1a2e',
  eyebrowsStyle: 'variant01',
  features: [],
  earrings: false,
  glassesStyle: '',
  backgroundColor: 'ede9fe',
};

const EYES_MAP: Record<Expressao, string> = {
  neutro:  'variant01',
  feliz:   'variant18',
  animado: 'variant23',
  triste:  'variant08',
};

const MOUTH_MAP: Record<Expressao, string> = {
  neutro:  'variant01',
  feliz:   'variant12',
  animado: 'variant14',
  triste:  'variant06',
};

interface Props {
  config: AvatarConfig;
  expressao?: Expressao;
  size?: number;
}

export default function AvatarPersonagem({ config, expressao = 'neutro', size = 120 }: Props) {
  const svg = createAvatar(adventurer, {
    seed: `plim-${config.genero}-${config.hairStyle}-${config.skinColor}`,
    skinColor: [config.skinColor] as any,
    hair: config.hairStyle ? ([config.hairStyle] as any) : undefined,
    hairColor: [config.hairColor] as any,
    eyes: [EYES_MAP[expressao]] as any,
    eyebrows: config.eyebrowsStyle ? ([config.eyebrowsStyle] as any) : undefined,
    mouth: [MOUTH_MAP[expressao]] as any,
    features: config.features.length > 0 ? (config.features as any) : undefined,
    earringsProbability: config.earrings ? 100 : 0,
    glasses: config.glassesStyle ? ([config.glassesStyle] as any) : undefined,
    glassesProbability: config.glassesStyle ? 100 : 0,
    backgroundColor: [config.backgroundColor] as any,
    backgroundType: ['solid'],
  }).toString();

  return <SvgXml xml={svg} width={size} height={size} />;
}

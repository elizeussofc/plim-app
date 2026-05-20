import React from 'react';
import Svg, { Circle, Rect, Path, G, Ellipse } from 'react-native-svg';

export type SkinTom = 'claro' | 'medio' | 'canela' | 'escuro';
export type EstiloCabelo = 'curto' | 'longo' | 'cacheado' | 'careca';
export type CorCabelo = 'preto' | 'castanho' | 'loiro' | 'ruivo' | 'roxo';
export type Roupa = 'padrao' | 'sport' | 'casual' | 'pro';
export type Acessorio = 'nenhum' | 'oculos' | 'chapeu' | 'medalha';
export type Expressao = 'feliz' | 'neutro' | 'triste' | 'animado';

export interface AvatarConfig {
  skinTom: SkinTom;
  cabelo: EstiloCabelo;
  corCabelo: CorCabelo;
  roupa: Roupa;
  acessorio: Acessorio;
}

export const avatarConfigPadrao: AvatarConfig = {
  skinTom: 'medio',
  cabelo: 'curto',
  corCabelo: 'preto',
  roupa: 'padrao',
  acessorio: 'nenhum',
};

const SKIN: Record<SkinTom, string> = {
  claro:   '#FDDBB4',
  medio:   '#E8A87C',
  canela:  '#C68642',
  escuro:  '#8D5524',
};

const HAIR: Record<CorCabelo, string> = {
  preto:    '#1A1A2E',
  castanho: '#7B3F00',
  loiro:    '#F4C430',
  ruivo:    '#CC4125',
  roxo:     '#7C3AED',
};

const OUTFIT: Record<Roupa, { camisa: string; calca: string }> = {
  padrao: { camisa: '#7C3AED', calca: '#334155' },
  sport:  { camisa: '#10B981', calca: '#064E3B' },
  casual: { camisa: '#F97316', calca: '#1E3A5F' },
  pro:    { camisa: '#1E293B', calca: '#0F172A' },
};

const MOUTHS: Record<Expressao, string> = {
  feliz:   'M 43 40 Q 50 47 57 40',
  neutro:  'M 43 42 L 57 42',
  triste:  'M 43 45 Q 50 39 57 45',
  animado: 'M 40 37 Q 50 51 60 37',
};

interface Props {
  config: AvatarConfig;
  expressao?: Expressao;
  size?: number;
}

export default function AvatarPersonagem({ config, expressao = 'neutro', size = 120 }: Props) {
  const skin = SKIN[config.skinTom];
  const hair = HAIR[config.corCabelo];
  const { camisa, calca } = OUTFIT[config.roupa];
  const isAnimado = expressao === 'animado';
  const isHappy = expressao === 'feliz' || isAnimado;

  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 100 130">

      {/* ── CABELO TRASEIRO ── */}
      {config.cabelo === 'curto' && (
        <Circle cx={50} cy={27} r={22} fill={hair} />
      )}
      {config.cabelo === 'longo' && (
        <G>
          <Circle cx={50} cy={27} r={22} fill={hair} />
          <Rect x={22} y={30} width={10} height={44} rx={5} fill={hair} />
          <Rect x={68} y={30} width={10} height={44} rx={5} fill={hair} />
        </G>
      )}
      {config.cabelo === 'cacheado' && (
        <G>
          <Circle cx={50} cy={27} r={22} fill={hair} />
          <Circle cx={30} cy={21} r={9}  fill={hair} />
          <Circle cx={70} cy={21} r={9}  fill={hair} />
          <Circle cx={38} cy={12} r={9}  fill={hair} />
          <Circle cx={62} cy={12} r={9}  fill={hair} />
          <Circle cx={50} cy={9}  r={10} fill={hair} />
        </G>
      )}

      {/* ── ORELHAS ── */}
      <Ellipse cx={29} cy={33} rx={4} ry={5} fill={skin} />
      <Ellipse cx={71} cy={33} rx={4} ry={5} fill={skin} />

      {/* ── CABEÇA ── */}
      <Circle cx={50} cy={33} r={21} fill={skin} />

      {/* ── CABELO FRANJA ── */}
      {config.cabelo !== 'careca' && (
        <Path
          d="M 29 32 Q 29 11 50 11 Q 71 11 71 32 Q 65 21 50 20 Q 35 21 29 32 Z"
          fill={hair}
        />
      )}

      {/* ── CHAPÉU (sobre o cabelo) ── */}
      {config.acessorio === 'chapeu' && (
        <G>
          <Rect x={24} y={15} width={52} height={7} rx={3.5} fill={HAIR[config.corCabelo]} />
          <Rect x={34} y={3}  width={32} height={14} rx={5}  fill={HAIR[config.corCabelo]} />
          <Rect x={34} y={3}  width={32} height={5} rx={2.5} fill="#FFFFFF" opacity={0.15} />
        </G>
      )}

      {/* ── OLHOS ── */}
      {isAnimado ? (
        <G>
          {/* olhos fechados de alegria */}
          <Path d="M 40 31 Q 43 27 46 31" fill="none" stroke="#1A1A2E" strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M 54 31 Q 57 27 60 31" fill="none" stroke="#1A1A2E" strokeWidth={2.5} strokeLinecap="round" />
        </G>
      ) : (
        <G>
          <Circle cx={43} cy={30} r={3}   fill="#1A1A2E" />
          <Circle cx={57} cy={30} r={3}   fill="#1A1A2E" />
          <Circle cx={44.2} cy={29} r={1.2} fill="white" />
          <Circle cx={58.2} cy={29} r={1.2} fill="white" />
        </G>
      )}

      {/* ── BOCHECHAS ── */}
      {isHappy && (
        <G>
          <Ellipse cx={37} cy={38} rx={5.5} ry={3} fill="#FFB3BA" opacity={0.55} />
          <Ellipse cx={63} cy={38} rx={5.5} ry={3} fill="#FFB3BA" opacity={0.55} />
        </G>
      )}

      {/* ── ÓCULOS (antes da boca) ── */}
      {config.acessorio === 'oculos' && (
        <G>
          <Circle cx={43} cy={30} r={6}   fill="none" stroke="#1A1A2E" strokeWidth={1.5} />
          <Circle cx={57} cy={30} r={6}   fill="none" stroke="#1A1A2E" strokeWidth={1.5} />
          <Path   d="M 49 30 L 51 30"     stroke="#1A1A2E" strokeWidth={1.5} />
          <Path   d="M 23 30 L 37 30"     stroke="#1A1A2E" strokeWidth={1.5} />
          <Path   d="M 63 30 L 77 30"     stroke="#1A1A2E" strokeWidth={1.5} />
        </G>
      )}

      {/* ── BOCA ── */}
      <Path
        d={MOUTHS[expressao]}
        stroke="#1A1A2E"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* ── PESCOÇO ── */}
      <Rect x={44} y={53} width={12} height={9} fill={skin} />

      {/* ── BRAÇOS (antes do corpo para cobrir junção) ── */}
      <Rect x={14} y={62} width={14} height={24} rx={7} fill={camisa} />
      <Rect x={72} y={62} width={14} height={24} rx={7} fill={camisa} />

      {/* ── MÃOS ── */}
      <Circle cx={21} cy={87} r={5.5} fill={skin} />
      <Circle cx={79} cy={87} r={5.5} fill={skin} />

      {/* ── CORPO / CAMISA ── */}
      <Rect x={28} y={59} width={44} height={32} rx={8} fill={camisa} />

      {/* detalhes da roupa */}
      {config.roupa === 'pro' && (
        <Path d="M 46 59 L 50 68 L 54 59" fill="white" opacity={0.25} />
      )}
      {config.roupa === 'sport' && (
        <Rect x={28} y={73} width={44} height={4} rx={0} fill="white" opacity={0.2} />
      )}

      {/* ── PERNAS / CALÇA ── */}
      <Rect x={31} y={88} width={16} height={27} rx={7} fill={calca} />
      <Rect x={53} y={88} width={16} height={27} rx={7} fill={calca} />

      {/* ── PÉS ── */}
      <Rect x={27} y={111} width={20} height={9} rx={5} fill="#1A1A2E" />
      <Rect x={53} y={111} width={20} height={9} rx={5} fill="#1A1A2E" />

      {/* ── MEDALHA (no peito) ── */}
      {config.acessorio === 'medalha' && (
        <G>
          <Rect x={48} y={60} width={4} height={11} fill="#FFD700" />
          <Circle cx={50} cy={72} r={8}  fill="#FFD700" />
          <Circle cx={50} cy={72} r={5.5} fill="#FFA500" />
          <Path
            d="M 50 67 L 51.2 70.5 L 55 70.5 L 52 72.5 L 53.2 76 L 50 74 L 46.8 76 L 48 72.5 L 45 70.5 L 48.8 70.5 Z"
            fill="#FFD700"
          />
        </G>
      )}

    </Svg>
  );
}

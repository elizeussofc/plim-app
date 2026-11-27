/**
 * Gym Plim: orientação geral de alimentação, água e pré e pós-treino.
 * Fontes e limites em docs/gym/PESQUISA.md. Orientação geral, não é plano alimentar:
 * não tem meta de calorias nem substitui nutricionista.
 */

export interface MetasNutri {
  /** Proteína por dia, em gramas (1,6 a 2,2 g por kg). */
  proteinaMin: number;
  proteinaMax: number;
  /** Proteína por refeição, em gramas (0,25 a 0,40 g por kg, entre 20 e 40 g). */
  refeicaoMin: number;
  refeicaoMax: number;
  /** Água do dia, em ml (30 a 35 ml por kg: regra prática, não diretriz). */
  aguaMin: number;
  aguaMax: number;
  /** Água a mais por causa do treino, em ml (cerca de 500 ml por hora). */
  aguaTreino: number;
  /** Para beber umas 4 horas antes do treino, em ml (5 a 7 ml por kg). */
  aguaAntesMin: number;
  aguaAntesMax: number;
}

const dezena = (n: number) => Math.round(n / 10) * 10;
const meia = (n: number) => Math.round(n / 50) * 50;

export function metasNutri(peso: number, minutosTreino: number): MetasNutri {
  return {
    proteinaMin: dezena(peso * 1.6),
    proteinaMax: dezena(peso * 2.2),
    refeicaoMin: Math.max(20, Math.min(40, Math.round(peso * 0.25))),
    refeicaoMax: Math.max(25, Math.min(40, Math.round(peso * 0.4))),
    aguaMin: meia(peso * 30),
    aguaMax: meia(peso * 35),
    aguaTreino: meia((minutosTreino / 60) * 500),
    aguaAntesMin: meia(peso * 5),
    aguaAntesMax: meia(peso * 7),
  };
}

export interface Alimento {
  id: string;
  nome: string;
  porcao: string;
  /** Gramas de proteína na porção (aproximado, Tabela TACO e rótulos). */
  proteina: number;
  tipo: 'proteina' | 'energia' | 'apoio';
  vegetal?: boolean;
}

export const ALIMENTOS: Alimento[] = [
  { id: 'frango', nome: 'Peito de frango grelhado', porcao: '1 filé (100 g)', proteina: 32, tipo: 'proteina' },
  { id: 'carne', nome: 'Carne moída magra', porcao: '4 colheres de sopa (100 g)', proteina: 26, tipo: 'proteina' },
  { id: 'tilapia', nome: 'Filé de tilápia', porcao: '1 filé (100 g)', proteina: 26, tipo: 'proteina' },
  { id: 'atum', nome: 'Atum em lata', porcao: '1 lata escorrida (120 g)', proteina: 30, tipo: 'proteina' },
  { id: 'ovo', nome: 'Ovo cozido ou mexido', porcao: '2 unidades', proteina: 13, tipo: 'proteina' },
  { id: 'queijo', nome: 'Queijo minas', porcao: '2 fatias (60 g)', proteina: 10, tipo: 'proteina' },
  { id: 'iogurte', nome: 'Iogurte natural', porcao: '1 pote (170 g)', proteina: 7, tipo: 'proteina' },
  { id: 'leite', nome: 'Leite', porcao: '1 copo (200 ml)', proteina: 6, tipo: 'proteina' },
  { id: 'feijao', nome: 'Feijão cozido', porcao: '1 concha (100 g)', proteina: 5, tipo: 'proteina', vegetal: true },
  { id: 'lentilha', nome: 'Lentilha cozida', porcao: '1 concha (100 g)', proteina: 6, tipo: 'proteina', vegetal: true },
  { id: 'grao', nome: 'Grão-de-bico cozido', porcao: '4 colheres de sopa (100 g)', proteina: 9, tipo: 'proteina', vegetal: true },
  { id: 'tofu', nome: 'Tofu', porcao: '1 fatia grossa (100 g)', proteina: 7, tipo: 'proteina', vegetal: true },
  { id: 'amendoim', nome: 'Amendoim torrado', porcao: '1 punhado (30 g)', proteina: 7, tipo: 'apoio', vegetal: true },
  { id: 'pasta', nome: 'Pasta de amendoim', porcao: '1 colher de sopa (15 g)', proteina: 4, tipo: 'apoio', vegetal: true },
  { id: 'arroz', nome: 'Arroz cozido', porcao: '4 colheres de sopa (100 g)', proteina: 3, tipo: 'energia', vegetal: true },
  { id: 'pao', nome: 'Pão francês', porcao: '1 unidade', proteina: 4, tipo: 'energia', vegetal: true },
  { id: 'aveia', nome: 'Aveia em flocos', porcao: '3 colheres de sopa (30 g)', proteina: 4, tipo: 'energia', vegetal: true },
  { id: 'banana', nome: 'Banana', porcao: '1 unidade', proteina: 1, tipo: 'energia', vegetal: true },
  { id: 'batata', nome: 'Batata-doce cozida', porcao: '1 pequena (100 g)', proteina: 1, tipo: 'energia', vegetal: true },
  { id: 'tapioca', nome: 'Tapioca', porcao: '1 unidade média', proteina: 0, tipo: 'energia', vegetal: true },
  { id: 'whey', nome: 'Proteína em pó (opcional)', porcao: '1 dose (30 g)', proteina: 24, tipo: 'proteina' },
];

export const ALIMENTO_POR_ID: Record<string, Alimento> = Object.fromEntries(ALIMENTOS.map((a) => [a.id, a]));

/** Soma a proteína de um prato montado: { frango: 1, arroz: 2 } = 1 porção de frango e 2 de arroz. */
export function proteinaDoPrato(prato: Record<string, number>): number {
  return Object.entries(prato).reduce((s, [id, qtd]) => s + (ALIMENTO_POR_ID[id]?.proteina ?? 0) * Math.max(0, qtd), 0);
}

export type AvaliacaoPrato = 'vazio' | 'pouco' | 'bom' | 'sobrou';

/** Compara a proteína do prato com a faixa por refeição. */
export function avaliarPrato(proteina: number, metas: Pick<MetasNutri, 'refeicaoMin' | 'refeicaoMax'>): AvaliacaoPrato {
  if (proteina <= 0) return 'vazio';
  if (proteina < metas.refeicaoMin) return 'pouco';
  if (proteina > metas.refeicaoMax + 15) return 'sobrou';
  return 'bom';
}

export interface Sugestao {
  titulo: string;
  texto: string;
  ideias: string[];
}

/** O que comer antes, conforme quanto tempo falta para o treino (em minutos). */
export function preTreino(minutosAteTreino: number): Sugestao {
  if (minutosAteTreino >= 150) {
    return {
      titulo: 'Dá tempo de uma refeição completa',
      texto: 'Faltando mais de 2 horas e meia, coma um prato normal: uma fonte de energia, uma de proteína e legumes ou salada.',
      ideias: ['Arroz, feijão, frango grelhado e salada', 'Macarrão com carne moída e legumes', 'Arroz, lentilha, ovo e abóbora refogada'],
    };
  }
  if (minutosAteTreino >= 60) {
    return {
      titulo: 'Um lanche de verdade',
      texto: 'Entre 1 e 2 horas e meia antes, um lanche com energia e um pouco de proteína, sem muita gordura para não pesar.',
      ideias: ['Banana amassada com aveia e iogurte', 'Pão com ovo mexido', 'Tapioca com queijo minas', 'Batata-doce com atum'],
    };
  }
  if (minutosAteTreino >= 20) {
    return {
      titulo: 'Algo leve e rápido',
      texto: 'Faltando menos de 1 hora, só algo fácil de digerir. Deixe a proteína para depois.',
      ideias: ['1 banana', '1 fatia de pão com geleia ou mel', '1 copo de suco de fruta'],
    };
  }
  return {
    titulo: 'Já vai treinar',
    texto: 'Em cima da hora, não precisa comer. Beba água e vá. Se você fez uma refeição nas últimas 3 ou 4 horas, está abastecido.',
    ideias: ['Um copo de água', 'Se sentir fraqueza, meia banana'],
  };
}

/**
 * O que comer depois. `horasDesdeRefeicao` = há quanto tempo foi a última refeição antes do treino acabar.
 * Quem comeu há pouco não precisa correr: a janela depois do treino é larga.
 */
export function posTreino(horasDesdeRefeicao: number, metas: Pick<MetasNutri, 'refeicaoMin' | 'refeicaoMax'>): Sugestao {
  const faixa = `${metas.refeicaoMin} a ${metas.refeicaoMax} g de proteína`;
  if (horasDesdeRefeicao >= 4) {
    return {
      titulo: 'Coma logo que der',
      texto: `Sua última refeição já faz tempo. Na próxima hora, faça uma refeição com ${faixa} e uma fonte de energia.`,
      ideias: ['Arroz, feijão e frango ou ovo', 'Omelete de 3 ovos com pão', 'Iogurte com aveia, banana e pasta de amendoim'],
    };
  }
  return {
    titulo: 'Sem pressa',
    texto: `Você comeu há pouco, então não precisa correr. Nas próximas 2 horas, faça uma refeição normal com ${faixa}.`,
    ideias: ['Seu almoço ou jantar de sempre, caprichando na proteína', 'Arroz, feijão, carne e salada', 'Sanduíche de atum com queijo e uma fruta'],
  };
}

export const REGRA_DE_OURO = 'Prefira comida de verdade: arroz, feijão, ovo, carne, legumes e fruta. Suplemento é praticidade, não obrigação.';
export const AVISO_NUTRI = 'Orientação geral, com base em diretrizes públicas. Não é plano alimentar. Se você tem problema nos rins, diabetes ou outra condição de saúde, converse com um nutricionista ou médico antes de mudar a alimentação.';

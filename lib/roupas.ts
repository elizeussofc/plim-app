/**
 * Guarda-roupa do avatar: as peças, quanto custam em moedas e quais são do Pro.
 * Só lógica, sem tela, para ter teste (tests/roupas.test.mjs).
 *
 * As moedas vêm de usar o app (foco, missões, desafios, treino). Até aqui não compravam nada;
 * agora compram roupa. As três peças mais vistosas são do Pro e não se compram com moeda.
 */
import type { AvatarConfig, Chapeu, Costas, Pescoco } from './avatar.ts';

export type Lugar = 'chapeu' | 'pescoco' | 'costas';

export interface Peca {
  id: Exclude<Chapeu | Pescoco | Costas, ''>;
  lugar: Lugar;
  nome: string;
  /** Preço em moedas. Peça do Pro não tem preço. */
  preco: number;
  pro: boolean;
}

export const PECAS: Peca[] = [
  { id: 'bone', lugar: 'chapeu', nome: 'Boné', preco: 60, pro: false },
  { id: 'laco', lugar: 'chapeu', nome: 'Laço', preco: 60, pro: false },
  { id: 'gorro', lugar: 'chapeu', nome: 'Gorro', preco: 80, pro: false },
  { id: 'festa', lugar: 'chapeu', nome: 'Chapéu de festa', preco: 100, pro: false },
  { id: 'orelhas', lugar: 'chapeu', nome: 'Orelhas de gato', preco: 150, pro: false },
  { id: 'coroa', lugar: 'chapeu', nome: 'Coroa', preco: 0, pro: true },
  { id: 'gravata', lugar: 'pescoco', nome: 'Gravata borboleta', preco: 50, pro: false },
  { id: 'cachecol', lugar: 'pescoco', nome: 'Cachecol', preco: 80, pro: false },
  { id: 'medalha', lugar: 'pescoco', nome: 'Medalha', preco: 0, pro: true },
  { id: 'mochila', lugar: 'costas', nome: 'Mochila', preco: 120, pro: false },
  { id: 'capa', lugar: 'costas', nome: 'Capa de herói', preco: 0, pro: true },
];

export const LUGARES: { id: Lugar; nome: string }[] = [
  { id: 'chapeu', nome: 'Cabeça' },
  { id: 'pescoco', nome: 'Pescoço' },
  { id: 'costas', nome: 'Costas' },
];

export const pecasDe = (lugar: Lugar) => PECAS.filter((p) => p.lugar === lugar);
export const pecaPorId = (id: string) => PECAS.find((p) => p.id === id);

export type Situacao = 'vestida' | 'minha' | 'comprar' | 'faltam-moedas' | 'pro';

/**
 * O que a pessoa pode fazer com a peça agora.
 * Quem é Pro usa as peças do Pro e ainda precisa de moedas para as outras: ser Pro não zera a loja.
 */
export function situacaoDaPeca(p: Peca, cfg: AvatarConfig, compradas: string[], moedas: number, ehPro: boolean): Situacao {
  if (cfg[p.lugar] === p.id) return 'vestida';
  if (p.pro) return ehPro ? 'minha' : 'pro';
  if (compradas.includes(p.id)) return 'minha';
  return moedas >= p.preco ? 'comprar' : 'faltam-moedas';
}

/**
 * Veste ou tira a peça. Vestir orelhas tira o fone: os dois ficam no mesmo arco da cabeça.
 * Devolve só os campos que mudam, para juntar ao avatar.
 */
export function vestir(p: Peca, cfg: AvatarConfig): Partial<AvatarConfig> {
  const tirar = cfg[p.lugar] === p.id;
  const mudanca: Partial<AvatarConfig> = { [p.lugar]: tirar ? '' : p.id };
  if (!tirar && p.id === 'orelhas' && cfg.fone) mudanca.fone = false;
  return mudanca;
}

/**
 * O avatar sem as peças do Pro. Usado quando o servidor diz que a pessoa não assina mais:
 * a coroa, a medalha e a capa saem do boneco (o que foi comprado com moedas fica).
 */
export function semPecasDoPro<T extends Pick<AvatarConfig, Lugar>>(cfg: T): T {
  const limpo = { ...cfg };
  for (const lugar of ['chapeu', 'pescoco', 'costas'] as Lugar[]) {
    if (pecaPorId(cfg[lugar])?.pro) (limpo as Record<Lugar, string>)[lugar] = '';
  }
  return limpo;
}

/** Quanto falta de moeda para a peça. */
export const faltam = (p: Peca, moedas: number) => Math.max(0, p.preco - moedas);

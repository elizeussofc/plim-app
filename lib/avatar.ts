/**
 * Avatar 3D do Plim: dados e opções. Sem dependência de tela nem de three.js,
 * para poder ser importado pelo armazenamento (stores) sem pesar o app.
 *
 * O boneco é o arquivo public/avatar/plim_avatar.glb, gerado por
 * tools/avatar/build_avatar.py. As peças e os materiais têm nome; trocar o
 * visual é mostrar/esconder peças e mudar a cor dos materiais.
 */

export type Expressao = 'feliz' | 'neutro' | 'triste' | 'animado';
export type Cabelo = 'curto' | 'coque';
/** Peças do guarda-roupa. '' = nada naquele lugar. Os nomes são os das peças dentro do .glb. */
export type Chapeu = '' | 'bone' | 'gorro' | 'laco' | 'festa' | 'orelhas' | 'coroa';
export type Pescoco = '' | 'cachecol' | 'gravata' | 'medalha';
export type Costas = '' | 'mochila' | 'capa';
export const CHAPEUS: Chapeu[] = ['bone', 'gorro', 'laco', 'festa', 'orelhas', 'coroa'];
export const PESCOCOS: Pescoco[] = ['cachecol', 'gravata', 'medalha'];
export const COSTAS: Costas[] = ['mochila', 'capa'];
/** Chapéus que cobrem o alto da cabeça: com eles o coque e as mechas ficam escondidos. */
export const COBRE_O_TOPO: Chapeu[] = ['bone', 'gorro', 'festa', 'coroa'];

export interface AvatarConfig {
  cabelo: Cabelo;
  pele: string;        // hex sem #
  corCabelo: string;
  corMoletom: string;
  corCalca: string;
  oculos: boolean;
  fone: boolean;
  fundo: string;       // cor do círculo atrás do retrato
  chapeu: Chapeu;
  pescoco: Pescoco;
  costas: Costas;
  corChapeu: string;   // boné, gorro, laço, chapéu de festa e orelhas
  corExtra: string;    // cachecol, gravata, fita da medalha, mochila e capa
  corTenis: string;
  corRaio: string;     // estampa do moletom
}

export const avatarConfigPadrao: AvatarConfig = {
  cabelo: 'curto',
  pele: 'C98A5E',
  corCabelo: '3B2219',
  corMoletom: '7C3AED',
  corCalca: '3A4250',
  oculos: false,
  fone: false,
  fundo: 'E7DBFF',
  chapeu: '',
  pescoco: '',
  costas: '',
  corChapeu: 'EA580C',
  corExtra: '2F7FE6',
  corTenis: 'F4F4F5',
  corRaio: 'F97316',
};

/**
 * A pessoa escolhe boneco masculino ou feminino. Por dentro continua sendo o campo
 * `cabelo`, porque é o nome das peças no .glb e o que já está salvo nos aparelhos:
 * 'curto' é o boneco masculino e 'coque' é o feminino.
 */
export const OPCOES_BONECO: { id: Cabelo; label: string }[] = [
  { id: 'curto', label: 'Masculino' },
  { id: 'coque', label: 'Feminino' },
];

export const OPCOES_PELE = ['F6D7BD', 'E8B893', 'C98A5E', 'A66A43', '7B4A2E', '4E2F1E'];
export const OPCOES_COR_CABELO = ['1F1410', '3B2219', '6B4226', 'B5732E', 'E0B85C', 'C2410C', 'DB4F93', '7C3AED', '2F7FE6', 'B8B5C4'];
export const OPCOES_MOLETOM = ['7C3AED', 'EA580C', '0E9F6E', '2F7FE6', 'DB4F93', 'D9A106', '2B1D4E', 'F4EDE1'];
export const OPCOES_CALCA = ['3A4250', '2B1D4E', '1E5FB8', '6B4226', '8A7FA3', 'F4EDE1'];
export const OPCOES_PECA = ['EA580C', '7C3AED', '2F7FE6', '0E9F6E', 'DB4F93', 'D9A106', '2B1D4E', 'F4EDE1'];
export const OPCOES_TENIS = ['F4F4F5', '2B1D4E', 'EA580C', '2F7FE6', 'DB4F93', '0E9F6E'];
export const OPCOES_RAIO = ['F97316', 'FFFFFF', 'FFD23F', '2B1D4E', '5EEAD4', 'F59AB5'];
export const OPCOES_FUNDO = ['E7DBFF', 'FFE9D6', 'DDF6EA', 'DDECFF', 'FFE1EE', 'FFF1C7', 'F4EDE1', '2B1D4E'];

const HEX = /^[0-9a-fA-F]{6}$/;
const hex = (v: unknown, padrao: string) => (typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : padrao);

/**
 * Aceita qualquer coisa que já tenha sido salva como avatar e devolve um avatar 3D válido.
 * Converte os formatos antigos (o 2D DiceBear, com skinColor/hairStyle, e o primeiro, com
 * skinTom) aproveitando o que dá: tom de pele, cor do cabelo, óculos e fundo.
 */
export function normalizarAvatar(bruto: unknown): AvatarConfig {
  const p = avatarConfigPadrao;
  if (!bruto || typeof bruto !== 'object') return { ...p };
  const b = bruto as Record<string, unknown>;

  if (b.cabelo === 'curto' || b.cabelo === 'coque') {
    return {
      cabelo: b.cabelo,
      pele: hex(b.pele, p.pele),
      corCabelo: hex(b.corCabelo, p.corCabelo),
      corMoletom: hex(b.corMoletom, p.corMoletom),
      corCalca: hex(b.corCalca, p.corCalca),
      oculos: b.oculos === true,
      fone: b.fone === true,
      fundo: hex(b.fundo, p.fundo),
      chapeu: (CHAPEUS as string[]).includes(b.chapeu as string) ? (b.chapeu as Chapeu) : '',
      pescoco: (PESCOCOS as string[]).includes(b.pescoco as string) ? (b.pescoco as Pescoco) : '',
      costas: (COSTAS as string[]).includes(b.costas as string) ? (b.costas as Costas) : '',
      corChapeu: hex(b.corChapeu, p.corChapeu),
      corExtra: hex(b.corExtra, p.corExtra),
      corTenis: hex(b.corTenis, p.corTenis),
      corRaio: hex(b.corRaio, p.corRaio),
    };
  }

  // Formato 2D antigo (DiceBear).
  const cabeloLongo = typeof b.hairStyle === 'string' && b.hairStyle.startsWith('long');
  return {
    ...p,
    cabelo: b.genero === 'feminino' || cabeloLongo ? 'coque' : 'curto',
    pele: hex(b.skinColor, p.pele),
    corCabelo: hex(b.hairColor, p.corCabelo),
    oculos: typeof b.glassesStyle === 'string' && b.glassesStyle !== '',
    fundo: hex(b.backgroundColor, p.fundo),
  };
}

/** Escurece uma cor (0–1). Usado na barra e no bolso do moletom. */
export function escurecer(corHex: string, fator = 0.84): string {
  const n = parseInt(corHex, 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * fator))).toString(16).padStart(2, '0');
  return (c((n >> 16) & 255) + c((n >> 8) & 255) + c(n & 255)).toUpperCase();
}

/** Chave estável de um avatar, para cache de imagem. */
export function chaveAvatar(c: AvatarConfig, expressao: Expressao): string {
  return [c.cabelo, c.pele, c.corCabelo, c.corMoletom, c.corCalca, c.oculos ? 1 : 0, c.fone ? 1 : 0, c.chapeu, c.pescoco, c.costas, c.corChapeu, c.corExtra, c.corTenis, c.corRaio, expressao].join('-');
}

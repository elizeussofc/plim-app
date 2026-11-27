/**
 * Motor 3D do avatar fora da web. O boneco 3D ao vivo só existe na versão web
 * (lib/avatar3d.web.ts); no celular o app mostra o retrato fixo.
 * As funções existem aqui para o código compartilhado compilar.
 */
import type { AvatarConfig, Expressao } from '@/lib/avatar';

export type Enquadramento = 'busto' | 'corpo';

export interface Palco {
  atualizar: (cfg: AvatarConfig, expressao: Expressao) => void;
  acenar: () => void;
  destruir: () => void;
}

export function retratoEmCache(_cfg: AvatarConfig, _expressao: Expressao, _enq: Enquadramento): string | undefined {
  return undefined;
}

export async function retratoAvatar(_cfg: AvatarConfig, _expressao: Expressao, _enq: Enquadramento = 'busto'): Promise<string> {
  throw new Error('Avatar 3D ao vivo disponível só na web.');
}

export async function criarPalco(_caixa: unknown, _cfg: AvatarConfig, _expressao: Expressao, _parado = false): Promise<Palco> {
  throw new Error('Avatar 3D ao vivo disponível só na web.');
}

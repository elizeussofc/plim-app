import { avisar, confirmar } from '@/lib/avisar';
import { somToque } from '@/lib/sons';
import { useGrupoStore } from '@/stores/grupoStore';

export const TEXTO_ENTRADA =
  'Ao entrar, seu apelido, sua bio e seu boneco ficam visíveis para quem usa o Plim. Seu e-mail nunca aparece. O Instagram, se você cadastrou, só é visto por assinantes do Pro. Você pode sair e apagar tudo quando quiser, no Perfil.';

/**
 * O portão do Grupo de verdade: antes de publicar, reagir ou comentar, a pessoa precisa ter
 * aceitado aparecer no Grupo. Na prévia local não há portão (nada sai do aparelho).
 */
export function useEntradaNoGrupo() {
  const modo = useGrupoStore((s) => s.modo);
  const participa = useGrupoStore((s) => s.participa);
  const entrar = useGrupoStore((s) => s.entrar);

  /** Devolve true se já pode agir; senão pede a entrada e, aceita, roda `depois`. */
  function podeAgir(depois: () => void): boolean {
    if (modo !== 'online' || participa) return true;
    confirmar('Entrar no Grupo', TEXTO_ENTRADA, 'Entrar no Grupo', () => {
      void entrar().then((ok) => {
        if (ok) { somToque(); depois(); }
        else avisar('Não deu para entrar agora', 'Confira a internet e tente de novo.');
      });
    });
    return false;
  }

  const aviso = modo === 'online'
    ? 'Fica visível para quem usa o Plim.'
    : 'Prévia: fica guardado só neste aparelho, ninguém mais vê.';

  return { modo, participa, podeAgir, aviso };
}

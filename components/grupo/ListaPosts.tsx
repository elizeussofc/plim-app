import CartaoPost from '@/components/grupo/CartaoPost';
import Comentarios from '@/components/grupo/Comentarios';
import { avisar } from '@/lib/avisar';
import type { Post } from '@/lib/grupo';
import * as api from '@/lib/grupoApi';
import { somComentar, somReagir } from '@/lib/sons';
import { useAuthStore } from '@/stores/authStore';
import { dizer } from '@/stores/falaStore';
import { useGrupoStore } from '@/stores/grupoStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

interface Props {
  posts: Post[];
  aoReagir: (postId: string, emoji: string) => void;
  aoApagar: (postId: string) => void;
  /** Antes de qualquer ação que publica algo: devolve false se a pessoa ainda não pode (ex.: não entrou no Grupo). */
  podeAgir: (depois: () => void) => boolean;
  /** Avisado quando o número de comentários de um post muda (para listas que não são o feed). */
  aoContarComentarios?: (postId: string, total: number) => void;
}

/** Uma lista de posts com tudo o que dá para fazer neles: reagir, comentar, apagar, denunciar e abrir o perfil. */
export default function ListaPosts({ posts, aoReagir, aoApagar, podeAgir, aoContarComentarios }: Props) {
  const router = useRouter();
  const eu = useAuthStore((s) => s.session?.user?.id ?? null);
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const { modo, comentarios, abrirComentarios, comentar, apagarComentario } = useGrupoStore();
  const [aberto, setAberto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const jaFalou = useRef(false);

  const postAberto = posts.find((p) => p.id === aberto) ?? null;
  const online = modo === 'online';

  function reagir(post: Post, emoji: string) {
    if (!podeAgir(() => reagir(post, emoji))) return;
    const vaiTirar = post.minhaReacao === emoji;
    aoReagir(post.id, emoji);
    if (!vaiTirar) {
      somReagir();
      if (!jaFalou.current) { jaFalou.current = true; dizer('grupo_reagiu'); }
    }
  }

  async function verComentarios(post: Post) {
    setAberto(post.id);
    if (!online || post.exemplo) return;
    setCarregando(true);
    await abrirComentarios(post.id);
    setCarregando(false);
    aoContarComentarios?.(post.id, useGrupoStore.getState().comentarios[post.id]?.length ?? post.comentarios);
  }

  async function enviar(texto: string): Promise<boolean> {
    if (!postAberto) return false;
    let liberado = false;
    if (!podeAgir(() => {})) return false;
    liberado = true;
    const ok = liberado && (await comentar(postAberto.id, texto));
    if (ok) {
      somComentar();
      dizer('grupo_comentou');
      aoContarComentarios?.(postAberto.id, useGrupoStore.getState().comentarios[postAberto.id]?.length ?? 0);
    } else {
      avisar('O comentário não foi enviado', 'Confira a internet e tente de novo.');
    }
    return ok;
  }

  function denunciar(tipo: 'post', id: string) {
    if (!eu || !online) return;
    api.denunciar(eu, tipo, id, null)
      .then(() => avisar('Denúncia enviada', 'Obrigado por avisar. A equipe do Plim vai olhar.'))
      .catch(() => avisar('Não deu para enviar', 'Tente de novo em instantes.'));
  }

  const abrirPessoa = (id: string) => router.push({ pathname: '/pessoa', params: { id } } as never);

  return (
    <>
      {posts.map((post) => (
        <CartaoPost
          key={post.id}
          post={post}
          aoReagir={(e) => reagir(post, e)}
          aoComentar={() => verComentarios(post)}
          aoAbrirPessoa={online && !post.exemplo && !post.meu ? () => abrirPessoa(post.autor.id) : undefined}
          aoApagar={post.meu ? () => aoApagar(post.id) : undefined}
          aoDenunciar={online ? () => denunciar('post', post.id) : undefined}
        />
      ))}

      <Comentarios
        post={postAberto}
        comentarios={aberto ? comentarios[aberto] ?? [] : []}
        carregando={carregando}
        ehPro={ehPro}
        aoFechar={() => setAberto(null)}
        aoEnviar={enviar}
        aoApagar={(id) => {
          if (!aberto) return;
          void apagarComentario(aberto, id).then(() => aoContarComentarios?.(aberto, useGrupoStore.getState().comentarios[aberto]?.length ?? 0));
        }}
        aoPedirPro={() => { setAberto(null); abrirPaywall('Comentar no Grupo'); }}
        aoAbrirPessoa={online ? (id) => { setAberto(null); abrirPessoa(id); } : undefined}
      />
    </>
  );
}

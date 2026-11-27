import Bolinha from '@/components/grupo/Bolinha';
import Compositor, { type Rascunho } from '@/components/grupo/Compositor';
import StoryViewer from '@/components/grupo/StoryViewer';
import { avisar } from '@/lib/avisar';
import { agruparStories, primeiroNaoVisto, type FilaDeStories } from '@/lib/grupo';
import * as api from '@/lib/grupoApi';
import { somStory, somToque } from '@/lib/sons';
import { useAuthStore } from '@/stores/authStore';
import { dizer } from '@/stores/falaStore';
import { euComoAutor, useGrupoStore } from '@/stores/grupoStore';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

interface Props {
  /** 'todos' = a fileira do Grupo; 'meus' = só os stories de quem está logado (Perfil). */
  quem: 'todos' | 'meus';
  /** Antes de publicar: devolve false se a pessoa ainda não pode (ex.: não entrou no Grupo). */
  podeAgir: (depois: () => void) => boolean;
  /** Onde o story vai aparecer, dito com todas as letras. */
  aviso: string;
}

/** As bolinhas de story: a da própria pessoa primeiro (com o "+"), depois as dos outros. */
export default function FileiraStories({ quem, podeAgir, aviso }: Props) {
  const router = useRouter();
  const eu = useAuthStore((s) => s.session?.user?.id ?? null);
  const { modo, stories, vistos, marcarVisto, publicarStory, apagarStory } = useGrupoStore();
  const [compondo, setCompondo] = useState(false);
  const [vendo, setVendo] = useState<{ fila: number; story: number } | null>(null);

  const vistosSet = useMemo(() => new Set(vistos), [vistos]);
  const filas = useMemo(() => {
    const todas = agruparStories(stories, vistosSet, Date.now());
    return quem === 'meus' ? todas.filter((f) => f.meu) : todas;
  }, [stories, vistosSet, quem]);
  const minha = filas.find((f) => f.meu);
  const outras = filas.filter((f) => !f.meu);
  const mim = euComoAutor();

  function abrir(fila: FilaDeStories) {
    somToque();
    setVendo({ fila: filas.indexOf(fila), story: primeiroNaoVisto(fila, vistosSet) });
  }

  function novo() {
    if (!podeAgir(novo)) return;
    setCompondo(true);
  }

  async function publicar(r: Rascunho): Promise<boolean> {
    const ok = await publicarStory({ texto: r.texto, local: r.local, cor: r.cor, imagem: r.imagem });
    if (ok) { setCompondo(false); somStory(); dizer('grupo_story'); }
    else avisar('O story não foi publicado', 'Confira a internet e tente de novo.');
    return ok;
  }

  function denunciar(storyId: string) {
    if (!eu || modo !== 'online') return;
    api.denunciar(eu, 'story', storyId, null)
      .then(() => avisar('Denúncia enviada', 'Obrigado por avisar. A equipe do Plim vai olhar.'))
      .catch(() => avisar('Não deu para enviar', 'Tente de novo em instantes.'));
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4, paddingRight: 8 }} accessibilityLabel="Stories">
        <Bolinha
          avatar={mim.avatar}
          nome={minha ? 'Seu story' : 'Novo story'}
          anel={minha ? (minha.novo ? 'novo' : 'visto') : 'nenhum'}
          mais
          aoTocar={minha ? () => abrir(minha) : novo}
          aoTocarMais={novo}
          rotulo={minha ? 'Ver o seu story' : 'Publicar um story'}
        />
        {outras.map((f) => (
          <Bolinha key={f.autor.id} avatar={f.autor.avatar} nome={f.autor.apelido} anel={f.novo ? 'novo' : 'visto'} aoTocar={() => abrir(f)} rotulo={`Ver o story de ${f.autor.apelido}`} />
        ))}
      </ScrollView>

      <Compositor tipo="story" visivel={compondo} aviso={aviso} aoFechar={() => setCompondo(false)} aoPublicar={publicar} />

      {vendo && filas.length > 0 && (
        <StoryViewer
          filas={filas}
          inicio={vendo}
          aoFechar={() => setVendo(null)}
          aoVer={marcarVisto}
          aoApagar={(id) => { void apagarStory(id); }}
          aoDenunciar={modo === 'online' ? denunciar : undefined}
          aoAbrirPessoa={modo === 'online' ? (id) => { setVendo(null); router.push({ pathname: '/pessoa', params: { id } } as never); } : undefined}
        />
      )}
    </View>
  );
}

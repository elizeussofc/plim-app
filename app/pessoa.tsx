import Bolinha from '@/components/grupo/Bolinha';
import ListaPosts from '@/components/grupo/ListaPosts';
import StoryViewer from '@/components/grupo/StoryViewer';
import Icone from '@/components/Icone';
import { Cabecalho, Peca, PecaBotao, Secao, Vazio } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar, confirmar } from '@/lib/avisar';
import { agruparStories, primeiroNaoVisto, trocarReacao } from '@/lib/grupo';
import * as api from '@/lib/grupoApi';
import { useEntradaNoGrupo } from '@/lib/grupoEntrada';
import { somToque } from '@/lib/sons';
import { C, F } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useGrupoStore } from '@/stores/grupoStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Perfil de outra pessoa do Grupo: boneco, bio, stories de hoje, Instagram (Pro) e publicações. */
export default function PessoaScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eu = useAuthStore((s) => s.session?.user?.id ?? null);
  const carregandoConta = useAuthStore((s) => s.loading);
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const { vistos, marcarVisto, discreto } = useGrupoStore();
  const { participa, podeAgir } = useEntradaNoGrupo();
  const [pessoa, setPessoa] = useState<api.Pessoa | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'sumiu' | 'falha'>('carregando');
  const [vendo, setVendo] = useState<number | null>(null);

  useEffect(() => {
    if (!id || !eu) return;
    let vivo = true;
    setEstado('carregando');
    api.lerPessoa(id, eu)
      .then((p) => {
        if (!vivo) return;
        setPessoa(p);
        setEstado(p ? 'pronto' : 'sumiu');
        // A visita só fica registrada para quem está no Grupo e não está em modo discreto.
        if (p && participa && !discreto) void api.registrarVisita(eu, id);
      })
      .catch(() => { if (vivo) setEstado('falha'); });
    return () => { vivo = false; };
  }, [id, eu, participa, discreto]);

  const vistosSet = useMemo(() => new Set(vistos), [vistos]);
  const filas = useMemo(() => (pessoa ? agruparStories(pessoa.stories, vistosSet, Date.now()) : []), [pessoa, vistosSet]);
  const fila = filas[0];

  if (!carregandoConta && !eu) return <Redirect href="/(tabs)/comunidade" />;
  if (id && eu && id === eu) return <Redirect href="/(tabs)/perfil" />;

  function reagir(postId: string, emoji: string) {
    if (!pessoa || !eu) return;
    const post = pessoa.posts.find((p) => p.id === postId);
    if (!post) return;
    const r = trocarReacao(post.reacoes, post.minhaReacao, emoji);
    const aplicar = (reacoes: Record<string, number>, minhaReacao: string | null) =>
      setPessoa((atual) => (atual ? { ...atual, posts: atual.posts.map((p) => (p.id === postId ? { ...p, reacoes, minhaReacao } : p)) } : atual));
    aplicar(r.reacoes, r.minha);
    api.reagir(eu, postId, r.minha).catch(() => { aplicar(post.reacoes, post.minhaReacao); avisar('A reação não foi enviada', 'Confira a internet e tente de novo.'); });
  }

  function denunciar(tipo: 'perfil' | 'story', alvo: string) {
    if (!eu) return;
    api.denunciar(eu, tipo, alvo, null)
      .then(() => avisar('Denúncia enviada', 'Obrigado por avisar. A equipe do Plim vai olhar.'))
      .catch(() => avisar('Não deu para enviar', 'Tente de novo em instantes.'));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Cabecalho titulo={pessoa?.autor.apelido ?? 'Perfil'} sub="No Grupo do Plim" />

        {estado === 'carregando' && <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />}
        {estado === 'sumiu' && <Vazio titulo="Essa pessoa não está mais no Grupo" texto="Ela pode ter saído ou apagado o perfil." />}
        {estado === 'falha' && <Vazio titulo="Não deu para abrir este perfil" texto="Confira a internet e tente de novo." />}

        {estado === 'pronto' && pessoa && (
          <>
            <Peca tinta="roxo" estilo={{ marginBottom: 16, alignItems: 'center' }}>
              <Bolinha
                avatar={pessoa.autor.avatar}
                nome=""
                tamanho={112}
                anel={fila ? (fila.novo ? 'novo' : 'visto') : 'nenhum'}
                aoTocar={fila ? () => { somToque(); setVendo(primeiroNaoVisto(fila, vistosSet)); } : undefined}
                rotulo={fila ? `Ver o story de ${pessoa.autor.apelido}` : `Boneco de ${pessoa.autor.apelido}`}
              />
              <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 26, color: C.text, marginTop: -8 }}>{pessoa.autor.apelido}</Text>
              {!!pessoa.bio && <Text style={{ fontSize: 15, color: C.textSub, textAlign: 'center', marginTop: 6, lineHeight: 22 }}>{pessoa.bio}</Text>}
              {!!fila && <Text style={{ fontSize: 13, color: C.primaryLight, marginTop: 8 }}>Toque no boneco para ver o story de hoje</Text>}
            </Peca>

            {/* Instagram: quem assina o Pro vê; o banco nem entrega para o grátis. */}
            {ehPro ? (
              pessoa.instagram ? (
                <PecaBotao padding={14} estilo={{ marginBottom: 16 }} onPress={() => void Linking.openURL(`https://www.instagram.com/${pessoa.instagram}/`)} accessibilityRole="link" accessibilityLabel={`Abrir o Instagram de ${pessoa.autor.apelido}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Icone nome="celular" tamanho={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: C.textSub }}>Instagram</Text>
                      <Text style={{ fontFamily: F.display, fontSize: 17, color: C.primaryLight }}>@{pessoa.instagram}</Text>
                    </View>
                    <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textMuted }}>›</Text>
                  </View>
                </PecaBotao>
              ) : (
                <Peca padding={14} estilo={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: C.textSub }}>{pessoa.autor.apelido} não cadastrou Instagram.</Text>
                </Peca>
              )
            ) : (
              <PecaBotao tinta="ouro" padding={14} estilo={{ marginBottom: 16 }} onPress={() => abrirPaywall('Ver o Instagram de quem está no Grupo')} accessibilityLabel="Ver o Instagram de quem cadastrou faz parte do Plim Pro">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Icone nome="coroa" tamanho={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>Instagram</Text>
                    <Text style={{ fontSize: 13, color: C.textSub, lineHeight: 19 }}>No Pro você vê o Instagram de quem cadastrou e sabe quem visitou o seu perfil.</Text>
                  </View>
                </View>
              </PecaBotao>
            )}

            <Secao titulo="Publicações" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{pessoa.posts.length}</Text>} />
            {pessoa.posts.length === 0
              ? <Vazio titulo="Nada publicado ainda" />
              : (
                <ListaPosts
                  posts={pessoa.posts}
                  aoReagir={reagir}
                  aoApagar={() => {}}
                  podeAgir={podeAgir}
                  aoContarComentarios={(postId, total) => setPessoa((atual) => (atual ? { ...atual, posts: atual.posts.map((p) => (p.id === postId ? { ...p, comentarios: total } : p)) } : atual))}
                />
              )}

            <Pressable
              onPress={() => confirmar('Denunciar este perfil', 'A equipe do Plim recebe o aviso e avalia. A pessoa não fica sabendo que foi você.', 'Denunciar', () => denunciar('perfil', pessoa.autor.id))}
              accessibilityRole="button"
              style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}
            >
              <Text style={{ fontSize: 14, color: C.textSub, textDecorationLine: 'underline' }}>Denunciar este perfil</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {vendo !== null && fila && (
        <StoryViewer filas={[fila]} inicio={{ fila: 0, story: vendo }} aoFechar={() => setVendo(null)} aoVer={marcarVisto} aoDenunciar={(storyId) => denunciar('story', storyId)} />
      )}
    </SafeAreaView>
  );
}

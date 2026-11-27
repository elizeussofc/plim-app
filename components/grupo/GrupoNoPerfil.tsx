import FileiraStories from '@/components/grupo/FileiraStories';
import Icone from '@/components/Icone';
import { Peca, PecaBotao, Secao } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar, confirmar } from '@/lib/avisar';
import { contar } from '@/lib/grupo';
import * as api from '@/lib/grupoApi';
import { useEntradaNoGrupo } from '@/lib/grupoEntrada';
import { somToque } from '@/lib/sons';
import { C, F } from '@/lib/theme';
import { useGrupoStore } from '@/stores/grupoStore';
import { useUserStore } from '@/stores/userStore';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

/** O pedaço do Grupo dentro do Perfil: seus stories, quem visitou você e a sua privacidade. */
export default function GrupoNoPerfil() {
  const router = useRouter();
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const { discreto, posts, stories, carregar, definirDiscreto, sair } = useGrupoStore();
  const { modo, participa, podeAgir, aviso } = useEntradaNoGrupo();
  const [visitas, setVisitas] = useState<number | null>(null);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const online = modo === 'online' && participa;
  useEffect(() => {
    if (!online) { setVisitas(null); return; }
    let vivo = true;
    api.totalDeVisitas().then((n) => { if (vivo) setVisitas(n); }).catch(() => {});
    return () => { vivo = false; };
  }, [online]);

  if (modo === 'carregando') return null;
  const meusPosts = posts.filter((p) => p.meu).length;
  const meusStories = stories.filter((s) => s.meu).length;

  function sairDoGrupo() {
    confirmar(
      online ? 'Sair do Grupo' : 'Apagar a prévia do Grupo',
      online
        ? 'Suas publicações, stories, comentários, reações e visitas são apagados de vez, e seu boneco some do Grupo. Você pode voltar depois.'
        : 'Tudo o que você publicou na prévia, neste aparelho, é apagado.',
      online ? 'Sair e apagar tudo' : 'Apagar',
      () => {
        void sair().then((ok) => {
          if (ok) avisar(online ? 'Você saiu do Grupo' : 'Prévia apagada', online ? 'Tudo o que era seu foi apagado.' : undefined);
          else avisar('Não deu para concluir', 'Confira a internet e tente de novo.');
        });
      },
    );
  }

  return (
    <View style={{ marginBottom: 22 }}>
      <Secao titulo="Seus stories" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{meusStories ? `${meusStories} no ar` : 'somem em 24 h'}</Text>} />
      <Peca padding={12} estilo={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FileiraStories quem="meus" podeAgir={podeAgir} aviso={aviso} />
          <Text style={{ flex: 1, fontSize: 14, color: C.textSub, lineHeight: 20 }}>
            {meusStories ? 'Toque na bolinha para rever. O + publica mais um.' : 'Conte o seu dia em uma foto ou uma frase.'}
          </Text>
        </View>
      </Peca>

      <PecaBotao
        padding={14}
        tinta={ehPro ? 'roxo' : 'ouro'}
        estilo={{ marginBottom: 12 }}
        onPress={() => router.push('/visitas' as never)}
        accessibilityLabel={`Quem visitou seu perfil${visitas != null ? `: ${visitas}` : ''}${ehPro ? '' : '. A lista de nomes faz parte do Plim Pro.'}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icone nome={ehPro ? 'parceria' : 'coroa'} tamanho={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>Quem visitou seu perfil</Text>
            <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>
              {!online
                ? 'Aparece quando você estiver no Grupo com a sua conta.'
                : visitas == null
                  ? 'Últimos 30 dias'
                  : `${contar(visitas, 'pessoa', 'pessoas')} nos últimos 30 dias${ehPro ? '' : '. Os nomes são do Pro.'}`}
            </Text>
          </View>
          <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textMuted }}>›</Text>
        </View>
      </PecaBotao>

      <Peca padding={14}>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text, marginBottom: 6 }}>Sua privacidade no Grupo</Text>
        <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>
          {online
            ? `Você está no Grupo com ${contar(meusPosts, 'publicação', 'publicações')}. Quem usa o Plim vê seu apelido, sua bio e seu boneco. Seu e-mail nunca aparece, e o Instagram só é visto por quem assina o Pro.`
            : modo === 'online'
              ? 'Você ainda não entrou no Grupo. Ninguém vê seu apelido nem seu boneco.'
              : 'Na prévia, tudo o que você publica fica só neste aparelho.'}
        </Text>

        {online && (
          <Pressable
            onPress={() => { somToque(); void definirDiscreto(!discreto); }}
            accessibilityRole="switch"
            accessibilityState={{ checked: discreto }}
            accessibilityLabel="Modo discreto"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, minHeight: 48 }}
          >
            <View style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: discreto ? C.primary : C.borderBright, padding: 3, alignItems: discreto ? 'flex-end' : 'flex-start' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.surface }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>Modo discreto</Text>
              <Text style={{ fontSize: 13, color: C.textSub, lineHeight: 18 }}>Suas visitas a outros perfis não ficam registradas. Em troca, você não vê quem visitou o seu.</Text>
            </View>
          </Pressable>
        )}

        {(online || meusPosts > 0 || meusStories > 0) && (
          <Pressable onPress={sairDoGrupo} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', marginTop: 6 }}>
            <Text style={{ fontSize: 14, color: C.textSub, textDecorationLine: 'underline' }}>{online ? 'Sair do Grupo e apagar tudo o que publiquei' : 'Apagar o que publiquei na prévia'}</Text>
          </Pressable>
        )}
      </Peca>
    </View>
  );
}

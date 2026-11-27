import AvatarPersonagem from '@/components/AvatarPersonagem';
import Compositor, { type Rascunho } from '@/components/grupo/Compositor';
import FileiraStories from '@/components/grupo/FileiraStories';
import ListaPosts from '@/components/grupo/ListaPosts';
import Icone from '@/components/Icone';
import { Botao, Peca, PecaBotao, Vazio } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar } from '@/lib/avisar';
import { hojeLocal, dataLocal } from '@/lib/dia';
import { TEXTO_ENTRADA, useEntradaNoGrupo } from '@/lib/grupoEntrada';
import { somPostar } from '@/lib/sons';
import { C, F } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { dizer } from '@/stores/falaStore';
import { useGrupoStore } from '@/stores/grupoStore';
import { useUserStore } from '@/stores/userStore';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Aba Grupo: stories em bolinhas, publicar com foto e lugar, reações com emoji e comentários. */
export default function ComunidadeScreen() {
  const router = useRouter();
  const logado = useAuthStore((s) => !!s.session);
  const profile = useUserStore((s) => s.profile);
  const unlockConquista = useUserStore((s) => s.unlockConquista);
  const addXp = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);
  const registrarEvento = useDesafiosStore((s) => s.registrarEvento);
  const { posts, atualizando, falha, carregar, publicar, reagir, apagarPost } = useGrupoStore();
  const { modo, participa, podeAgir, aviso } = useEntradaNoGrupo();
  const [compondo, setCompondo] = useState(false);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  function escrever() {
    if (!podeAgir(escrever)) return;
    setCompondo(true);
  }

  async function enviar(r: Rascunho): Promise<boolean> {
    // Pontos só na primeira publicação do dia, para o Grupo não virar fábrica de XP.
    const jaPublicouHoje = posts.some((p) => p.meu && dataLocal(new Date(p.criadoEm)) === hojeLocal());
    const ok = await publicar({ texto: r.texto, local: r.local, imagem: r.imagem });
    if (!ok) { avisar('A publicação não foi enviada', 'Confira a internet e tente de novo. Seu texto continua aqui.'); return false; }
    setCompondo(false);
    somPostar();
    dizer('grupo_post');
    unlockConquista('comunidade');
    if (!jaPublicouHoje) { addXp(10); addMoedas(5); registrarEvento('comunidade')(addXp, addMoedas); }
    return true;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={atualizando && modo !== 'carregando'} onRefresh={() => void carregar()} tintColor={C.primary} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 30, color: C.text }}>Grupo</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Botao rotulo="Atualizar" cor="claro" pequeno onPress={() => void carregar()} disabled={atualizando} />
            <Botao rotulo="Ranking" icone="trofeu" cor="claro" pequeno onPress={() => router.push('/ranking')} accessibilityLabel="Ver ranking" />
          </View>
        </View>

        {modo === 'carregando' ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={{ marginBottom: 16 }}>
              <FileiraStories quem="todos" podeAgir={podeAgir} aviso={aviso} />
            </View>

            {!!falha && (
              <Peca tinta="ouro" padding={12} estilo={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 14, color: C.text, lineHeight: 20 }}>{falha}</Text>
              </Peca>
            )}

            {modo === 'local' && (
              <Peca tinta="laranja" padding={14} estilo={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Icone nome="lampada" tamanho={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>Prévia do Grupo</Text>
                    <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20, marginTop: 2 }}>
                      {logado
                        ? 'O Grupo com outras pessoas está sendo ligado. Por enquanto, o que você publicar fica só neste aparelho, e os posts marcados como exemplo mostram como vai ser.'
                        : 'Entre na sua conta para participar do Grupo com outras pessoas. Sem conta, o que você publicar fica só neste aparelho.'}
                    </Text>
                  </View>
                </View>
                {!logado && <Botao rotulo="Entrar na conta" pequeno cor="laranja" onPress={() => router.push('/(auth)/login')} estilo={{ marginTop: 10 }} />}
              </Peca>
            )}

            {modo === 'online' && !participa && (
              <Peca tinta="roxo" padding={14} estilo={{ marginBottom: 14 }}>
                <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>Você está só olhando</Text>
                <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20, marginTop: 4 }}>{TEXTO_ENTRADA}</Text>
                <Botao rotulo="Entrar no Grupo" pequeno onPress={() => podeAgir(() => {})} estilo={{ marginTop: 10 }} />
              </Peca>
            )}

            {/* Chamada para publicar */}
            <PecaBotao onPress={escrever} padding={12} estilo={{ marginBottom: 18 }} accessibilityLabel="Escrever uma publicação">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <AvatarPersonagem config={profile.avatar_config} size={44} />
                <Text style={{ flex: 1, fontSize: 16, color: C.textMuted }}>O que você quer contar?</Text>
                <View style={{ backgroundColor: C.glass, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: C.primaryLight }}>🖼️ Foto</Text>
                </View>
              </View>
            </PecaBotao>

            {posts.length === 0
              ? <Vazio titulo="Ainda silencioso por aqui" texto="Publique a primeira mensagem do Grupo. Pode ser uma vitória pequena." />
              : <ListaPosts posts={posts} aoReagir={reagir} aoApagar={(id) => void apagarPost(id)} podeAgir={podeAgir} />}

            <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 19 }}>
              Aqui a regra é gentileza. Viu algo que machuca? Toque nos três pontinhos da publicação e denuncie.
            </Text>
          </>
        )}
      </ScrollView>

      <Compositor tipo="post" visivel={compondo} aviso={aviso} aoFechar={() => setCompondo(false)} aoPublicar={enviar} />
    </SafeAreaView>
  );
}

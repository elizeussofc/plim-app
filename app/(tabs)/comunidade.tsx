import { C, F } from '@/lib/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icone from '@/components/Icone';
import { Botao, Peca, Selo } from '@/components/plim';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from '@/components/Texto';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type TipoPost = 'conquista' | 'desafio' | 'texto';
type Reacao   = 'apoio' | 'forca' | 'parabens';

interface Post {
  id: string; tipo: TipoPost; conteudo: string; apelido: string; tempo: string;
  reacoes: Record<Reacao, number>; minhasReacoes: Record<Reacao, boolean>;
  /** Mensagem de demonstração (não foi escrita por ninguém de verdade). */
  exemplo?: boolean;
}

const postsMock: Post[] = [
  { id: '1', tipo: 'conquista', conteudo: 'Completei minha rotina matinal por 7 dias seguidos! Parece pequeno mas pra mim é enorme. 🥹', apelido: 'Ana', tempo: 'exemplo', exemplo: true, reacoes: { apoio: 12, forca: 5, parabens: 8 }, minhasReacoes: { apoio: false, forca: false, parabens: false } },
  { id: '2', tipo: 'desafio',   conteudo: 'Hoje foi difícil. Não consegui nem começar o que tinha planejado. Mas amanhã é outro dia.', apelido: 'Anônimo', tempo: 'exemplo', exemplo: true, reacoes: { apoio: 24, forca: 18, parabens: 2 }, minhasReacoes: { apoio: false, forca: false, parabens: false } },
];

const CHAVE_MURAL = 'plim-mural-proprio';

const tipoCor: Record<TipoPost, string> = {
  conquista: C.success,
  desafio:   C.accent,
  texto:     C.primaryLight,
};

const tipoLabel: Record<TipoPost, string> = {
  conquista: '🏆 Conquista',
  desafio:   '💪 Desafio',
  texto:     '💬 Texto',
};

const tipos: { key: TipoPost; label: string }[] = [
  { key: 'conquista', label: '🏆 Conquista' },
  { key: 'desafio',   label: '💪 Desafio'   },
  { key: 'texto',     label: '💬 Texto'      },
];

const reacoes: { key: Reacao; emoji: string; label: string }[] = [
  { key: 'apoio',    emoji: '🫂', label: 'Apoio'    },
  { key: 'forca',    emoji: '💪', label: 'Força'    },
  { key: 'parabens', emoji: '🎉', label: 'Parabéns' },
];

function ReacaoBtn({ emoji, label, count, ativo, onPress }: {
  emoji: string; label: string; count: number; ativo: boolean; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function press() {
    scale.value = withSpring(1.3, { damping: 10 }, () => { scale.value = withSpring(1); });
    onPress();
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={press}
        accessibilityLabel={`${label}: ${count}`}
        accessibilityRole="button"
        accessibilityState={{ selected: ativo }}
        android_ripple={{ color: C.primaryLight + '33', borderless: true }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 20,
          minHeight: 44,
          backgroundColor: ativo ? C.glassStrong : C.surfaceHigh,
          borderWidth: 1,
          borderColor: ativo ? C.borderPrimary : C.border,
        }}
      >
        <Text style={{ fontSize: 14 }}>{emoji}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: ativo ? C.primaryLight : C.textSub }}>
          {count}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function PostCard({ post, onReagir, delay }: { post: Post; onReagir: (id: string, r: Reacao) => void; delay: number }) {
  const cor = tipoCor[post.tipo];
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: C.glassStrong,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: C.borderPrimary,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.primaryLight }}>{post.apelido[0]}</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{post.apelido}</Text>
        </View>
        {post.exemplo
          ? <Selo texto="exemplo" tinta="laranja" />
          : <Text style={{ fontSize: 12, color: C.textMuted }}>{post.tempo}</Text>}
      </View>

      <View style={{
        backgroundColor: cor + '20',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: cor + '44',
      }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: cor }}>{tipoLabel[post.tipo]}</Text>
      </View>

      <Text style={{ fontSize: 14, color: C.text, lineHeight: 22, marginBottom: 14 }}>{post.conteudo}</Text>

      <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
        {reacoes.map(({ key, emoji, label }) => (
          <ReacaoBtn
            key={key}
            emoji={emoji}
            label={label}
            count={post.reacoes[key]}
            ativo={post.minhasReacoes[key]}
            onPress={() => onReagir(post.id, key)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

export default function ComunidadeScreen() {
  const router  = useRouter();
  const profile = useUserStore((s) => s.profile);
  const unlockConquista = useUserStore((s) => s.unlockConquista);
  const addXp    = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);
  const registrarEvento = useDesafiosStore((s) => s.registrarEvento);

  const [posts, setPosts]             = useState<Post[]>(postsMock);
  const carregou = useRef(false);

  // O que a pessoa escreve fica guardado no aparelho (antes sumia ao recarregar).
  useEffect(() => {
    AsyncStorage.getItem(CHAVE_MURAL)
      .then((bruto) => {
        const meus: Post[] = bruto ? JSON.parse(bruto) : [];
        if (Array.isArray(meus) && meus.length) setPosts([...meus, ...postsMock]);
      })
      .catch(() => {})
      .finally(() => { carregou.current = true; });
  }, []);

  useEffect(() => {
    if (!carregou.current) return;
    AsyncStorage.setItem(CHAVE_MURAL, JSON.stringify(posts.filter((p) => !p.exemplo).slice(0, 50))).catch(() => {});
  }, [posts]);
  const [modalAberto, setModalAberto] = useState(false);
  const [novoTexto, setNovoTexto]     = useState('');
  const [novoTipo, setNovoTipo]       = useState<TipoPost>('texto');

  function reagir(postId: string, reacao: Reacao) {
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const ja = p.minhasReacoes[reacao];
      return { ...p, reacoes: { ...p.reacoes, [reacao]: p.reacoes[reacao] + (ja ? -1 : 1) }, minhasReacoes: { ...p.minhasReacoes, [reacao]: !ja } };
    }));
  }

  function compartilhar() {
    if (!novoTexto.trim()) return;
    const apelido = profile.apelido ?? profile.nome ?? 'Anônimo';
    const novo: Post = { id: Date.now().toString(), tipo: novoTipo, conteudo: novoTexto.trim(), apelido, tempo: 'agora', reacoes: { apoio: 0, forca: 0, parabens: 0 }, minhasReacoes: { apoio: false, forca: false, parabens: false } };
    setPosts((prev) => [novo, ...prev]);
    unlockConquista('comunidade'); addXp(10); addMoedas(5);
    registrarEvento('comunidade')(addXp, addMoedas);
    setNovoTexto(''); setNovoTipo('texto'); setModalAberto(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 30, color: C.text }}>Grupo</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Botao rotulo="Ranking" icone="trofeu" cor="claro" pequeno onPress={() => router.push('/ranking')} accessibilityLabel="Ver ranking" />
            <Botao rotulo="+ Escrever" pequeno onPress={() => setModalAberto(true)} accessibilityLabel="Escrever no mural" />
          </View>
        </View>

        {/* Aviso: isto ainda é uma prévia */}
        <Peca tinta="laranja" padding={14} estilo={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icone nome="lampada" tamanho={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>Prévia do Grupo</Text>
              <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20, marginTop: 2 }}>
                O grupo de verdade ainda não está no ar. As mensagens marcadas como exemplo mostram como vai ser, e o que você escrever fica só neste aparelho.
              </Text>
            </View>
          </View>
        </Peca>

        {posts.length === 0 && (
          <Animated.View entering={FadeInDown.delay(140).springify()} style={{
            backgroundColor: C.surface,
            borderRadius: 18,
            padding: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: C.border,
          }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>💬</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.primaryLight, marginBottom: 6 }}>Ainda silencioso por aqui</Text>
            <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center' }}>Escreva a primeira mensagem do seu mural.</Text>
          </Animated.View>
        )}

        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} onReagir={reagir} delay={140 + i * 80} />
        ))}
      </ScrollView>

      <Modal visible={modalAberto} animationType="slide" transparent onRequestClose={() => setModalAberto(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} onPress={() => setModalAberto(false)} accessibilityLabel="Fechar modal" />
          <View style={{
            backgroundColor: C.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 40,
            borderTopWidth: 1,
            borderColor: C.borderPrimary,
          }}>
            <View style={{ width: 36, height: 4, backgroundColor: C.borderBright, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20 }}>Escrever no mural</Text>

            <Text style={{ fontSize: 11, color: C.textSub, fontWeight: '700', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>tipo</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {tipos.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => setNovoTipo(t.key)}
                  accessibilityLabel={`Tipo: ${t.label}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: novoTipo === t.key }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: novoTipo === t.key ? C.primary : C.surfaceHigh,
                    borderWidth: 1,
                    borderColor: novoTipo === t.key ? C.borderPrimary : C.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: novoTipo === t.key ? '#fff' : C.textSub }}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: 11, color: C.textSub, fontWeight: '700', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>mensagem</Text>
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="Conte como está indo. Por enquanto, só você vê."
              placeholderTextColor={C.textMuted}
              value={novoTexto}
              onChangeText={setNovoTexto}
              autoFocus
              accessibilityLabel="Sua mensagem"
              style={{
                backgroundColor: C.surfaceHigh,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 13,
                color: C.text,
                fontSize: 14,
                textAlignVertical: 'top',
                minHeight: 100,
                marginBottom: 20,
              }}
            />
            <Pressable
              onPress={compartilhar}
              accessibilityLabel="Publicar post"
              accessibilityRole="button"
              disabled={!novoTexto.trim()}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
              style={{
                backgroundColor: novoTexto.trim() ? C.primary : C.primary + '55',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                shadowColor: C.primary,
                shadowOpacity: novoTexto.trim() ? 0.5 : 0,
                shadowRadius: 12,
                elevation: novoTexto.trim() ? 8 : 0,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Publicar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

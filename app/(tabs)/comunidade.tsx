import { C } from '@/lib/theme';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type TipoPost = 'conquista' | 'desafio' | 'texto';
type Reacao   = 'apoio' | 'forca' | 'parabens';

interface Post {
  id: string; tipo: TipoPost; conteudo: string; apelido: string; tempo: string;
  reacoes: Record<Reacao, number>; minhasReacoes: Record<Reacao, boolean>;
}

const postsMock: Post[] = [
  { id: '1', tipo: 'conquista', conteudo: 'Completei minha rotina matinal por 7 dias seguidos! Parece pequeno mas pra mim é enorme. 🥹', apelido: 'Ana', tempo: 'há 10 min', reacoes: { apoio: 12, forca: 5, parabens: 8 }, minhasReacoes: { apoio: false, forca: false, parabens: false } },
  { id: '2', tipo: 'desafio',   conteudo: 'Hoje foi difícil. Não consegui nem começar o que tinha planejado. Mas amanhã é outro dia.', apelido: 'Anônimo', tempo: 'há 1h', reacoes: { apoio: 24, forca: 18, parabens: 2 }, minhasReacoes: { apoio: false, forca: false, parabens: false } },
];

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

const reacoes: { key: Reacao; emoji: string }[] = [
  { key: 'apoio',    emoji: '🫂' },
  { key: 'forca',    emoji: '💪' },
  { key: 'parabens', emoji: '🎉' },
];

function PostCard({ post, onReagir, delay }: { post: Post; onReagir: (id: string, r: Reacao) => void; delay: number }) {
  const cor = tipoCor[post.tipo];
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{
      backgroundColor: C.surface, borderRadius: 20, padding: 18,
      borderWidth: 1, borderColor: C.border, marginBottom: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.primaryLight + '33' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.primaryLight }}>{post.apelido[0]}</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{post.apelido}</Text>
        </View>
        <Text style={{ fontSize: 11, color: C.textMuted }}>{post.tempo}</Text>
      </View>

      <View style={{ backgroundColor: cor + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1, borderColor: cor + '44' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: cor }}>{tipoLabel[post.tipo]}</Text>
      </View>

      <Text style={{ fontSize: 14, color: C.text, lineHeight: 22, marginBottom: 14 }}>{post.conteudo}</Text>

      <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
        {reacoes.map(({ key, emoji }) => {
          const ativo = post.minhasReacoes[key];
          const scale = useSharedValue(1);
          const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
          function press() {
            scale.value = withSpring(1.3, { damping: 10 }, () => { scale.value = withSpring(1); });
            onReagir(post.id, key);
          }
          return (
            <Animated.View key={key} style={animStyle}>
              <Pressable onPress={press} style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                backgroundColor: ativo ? C.primary + '33' : C.surfaceHigh,
                borderWidth: 1, borderColor: ativo ? C.primaryLight + '55' : C.border,
              }}>
                <Text style={{ fontSize: 14 }}>{emoji}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: ativo ? C.primaryLight : C.textSub }}>
                  {post.reacoes[key]}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
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

  const [posts, setPosts]       = useState<Post[]>(postsMock);
  const [modalAberto, setModalAberto] = useState(false);
  const [novoTexto, setNovoTexto] = useState('');
  const [novoTipo, setNovoTipo]  = useState<TipoPost>('texto');

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
        <Animated.View entering={FadeInUp.delay(0).springify()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>comunidade</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => router.push('/ranking')} style={{ backgroundColor: C.surfaceHigh, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.gold, fontWeight: '700', fontSize: 13 }}>🏆 ranking</Text>
            </Pressable>
            <Pressable onPress={() => setModalAberto(true)} style={{ backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ post</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()} style={{ backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 }}>
            🤝 um lugar seguro. sem julgamentos, sem competição.{'\n'}só apoio de verdade.
          </Text>
        </Animated.View>

        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} onReagir={reagir} delay={140 + i * 80} />
        ))}
      </ScrollView>

      <Modal visible={modalAberto} animationType="slide" transparent onRequestClose={() => setModalAberto(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setModalAberto(false)} />
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: C.border }}>
            <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20 }}>compartilhar</Text>

            <Text style={{ fontSize: 11, color: C.textSub, fontWeight: '700', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>tipo</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {tipos.map((t) => (
                <Pressable key={t.key} onPress={() => setNovoTipo(t.key)} style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: novoTipo === t.key ? C.primary : C.surfaceHigh, borderWidth: 1, borderColor: novoTipo === t.key ? C.primaryLight + '55' : C.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: novoTipo === t.key ? '#fff' : C.textSub }}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: 11, color: C.textSub, fontWeight: '700', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>mensagem</Text>
            <TextInput
              multiline numberOfLines={4} placeholder="Conte como está indo... a comunidade te apoia 🤝"
              placeholderTextColor={C.textMuted} value={novoTexto} onChangeText={setNovoTexto} autoFocus
              style={{ backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, color: C.text, fontSize: 14, textAlignVertical: 'top', minHeight: 100, marginBottom: 20 }}
            />
            <Pressable onPress={compartilhar} style={{ backgroundColor: novoTexto.trim() ? C.primary : C.primary + '55', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Publicar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

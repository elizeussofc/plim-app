import { Badge, Card, Text } from '@/components/ui';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TipoPost = 'conquista' | 'desafio' | 'texto';

interface Post {
  id: string;
  tipo: TipoPost;
  conteudo: string;
  apelido: string;
  tempo: string;
  reacoes: { apoio: number; forca: number; parabens: number };
  minhasReacoes: { apoio: boolean; forca: boolean; parabens: boolean };
}

const postsMock: Post[] = [
  {
    id: '1',
    tipo: 'conquista',
    conteudo: 'Completei minha rotina matinal por 7 dias seguidos! Parece pequeno mas pra mim é enorme. 🥹',
    apelido: 'Ana',
    tempo: 'há 10 min',
    reacoes: { apoio: 12, forca: 5, parabens: 8 },
    minhasReacoes: { apoio: false, forca: false, parabens: false },
  },
  {
    id: '2',
    tipo: 'desafio',
    conteudo: 'Hoje foi difícil. Não consegui nem começar o que tinha planejado. Mas amanhã é outro dia.',
    apelido: 'Anônimo',
    tempo: 'há 1h',
    reacoes: { apoio: 24, forca: 18, parabens: 2 },
    minhasReacoes: { apoio: false, forca: false, parabens: false },
  },
];

const tipoLabels: Record<TipoPost, { label: string; variant: 'success' | 'energy' | 'primary' }> = {
  conquista: { label: '🏆 Conquista', variant: 'success' },
  desafio:   { label: '💪 Desafio', variant: 'energy' },
  texto:     { label: '💬 Texto', variant: 'primary' },
};

const tipos: { key: TipoPost; label: string }[] = [
  { key: 'conquista', label: '🏆 Conquista' },
  { key: 'desafio',   label: '💪 Desafio' },
  { key: 'texto',     label: '💬 Texto' },
];

type Reacao = 'apoio' | 'forca' | 'parabens';

export default function ComunidadeScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const unlockConquista = useUserStore((s) => s.unlockConquista);
  const addXp = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);
  const registrarEvento = useDesafiosStore((s) => s.registrarEvento);

  const [posts, setPosts] = useState<Post[]>(postsMock);
  const [modalAberto, setModalAberto] = useState(false);
  const [novoTexto, setNovoTexto] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoPost>('texto');

  function reagir(postId: string, reacao: Reacao) {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const jaReagiu = p.minhasReacoes[reacao];
        return {
          ...p,
          reacoes: {
            ...p.reacoes,
            [reacao]: p.reacoes[reacao] + (jaReagiu ? -1 : 1),
          },
          minhasReacoes: {
            ...p.minhasReacoes,
            [reacao]: !jaReagiu,
          },
        };
      })
    );
  }

  function compartilhar() {
    if (!novoTexto.trim()) return;
    const apelido = profile.apelido ?? profile.nome ?? 'Anônimo';
    const novoPost: Post = {
      id: Date.now().toString(),
      tipo: novoTipo,
      conteudo: novoTexto.trim(),
      apelido,
      tempo: 'agora',
      reacoes: { apoio: 0, forca: 0, parabens: 0 },
      minhasReacoes: { apoio: false, forca: false, parabens: false },
    };
    setPosts((prev) => [novoPost, ...prev]);
    unlockConquista('comunidade');
    addXp(10);
    addMoedas(5);
    registrarEvento('comunidade')(addXp, addMoedas);
    setNovoTexto('');
    setNovoTipo('texto');
    setModalAberto(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView
        style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-6">
          <Text variant="h2" className="text-violet-800">Comunidade</Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push('/ranking')}
              className="bg-violet-100 px-3 py-2 rounded-full active:opacity-70"
            >
              <Text className="text-violet-700 font-semibold text-sm">🏆 Ranking</Text>
            </Pressable>
            <Pressable
              onPress={() => setModalAberto(true)}
              className="bg-violet-600 px-3 py-2 rounded-full active:opacity-70"
            >
              <Text className="text-white font-semibold text-sm">+ Post</Text>
            </Pressable>
          </View>
        </View>

        <Card variant="flat" padding="md" className="mb-5">
          <Text variant="small" color="secondary" className="text-center leading-5">
            🤝 Um lugar seguro. Sem julgamentos, sem competição.{'\n'}Só apoio de verdade.
          </Text>
        </Card>

        <View className="gap-4">
          {posts.map((post) => {
            const tipo = tipoLabels[post.tipo];
            return (
              <Card key={post.id} variant="default" padding="lg">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 bg-violet-100 rounded-full items-center justify-center">
                      <Text variant="small" className="text-violet-700 font-bold">{post.apelido[0]}</Text>
                    </View>
                    <Text variant="small" className="font-semibold text-slate-700">{post.apelido}</Text>
                  </View>
                  <Text variant="caption" color="muted">{post.tempo}</Text>
                </View>

                <Badge label={tipo.label} variant={tipo.variant} />
                <Text className="mt-3 text-slate-700 leading-6">{post.conteudo}</Text>

                <View className="flex-row gap-2 mt-4 pt-4 border-t border-slate-100">
                  {(
                    [
                      { key: 'apoio' as Reacao, emoji: '🫂', label: 'Apoio' },
                      { key: 'forca' as Reacao, emoji: '💪', label: 'Força' },
                      { key: 'parabens' as Reacao, emoji: '🎉', label: 'Parabéns' },
                    ] as const
                  ).map(({ key, emoji }) => (
                    <Pressable
                      key={key}
                      onPress={() => reagir(post.id, key)}
                      className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full active:opacity-70 ${post.minhasReacoes[key] ? 'bg-violet-100' : 'bg-slate-50 border border-slate-200'}`}
                    >
                      <Text className="text-sm">{emoji}</Text>
                      <Text variant="caption" className={post.minhasReacoes[key] ? 'text-violet-700 font-bold' : 'text-slate-500'}>
                        {post.reacoes[key]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal Compartilhar */}
      <Modal
        visible={modalAberto}
        animationType="slide"
        transparent
        onRequestClose={() => setModalAberto(false)}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable className="flex-1 bg-black/30" onPress={() => setModalAberto(false)} />
          <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />
            <Text variant="h3" className="text-violet-800 mb-4">Compartilhar com a comunidade</Text>

            {/* Tipo */}
            <Text variant="small" color="secondary" className="mb-2 font-semibold">Tipo</Text>
            <View className="flex-row gap-2 mb-4">
              {tipos.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => setNovoTipo(t.key)}
                  className={`flex-1 py-2 rounded-2xl items-center ${novoTipo === t.key ? 'bg-violet-600' : 'bg-slate-100'}`}
                >
                  <Text variant="small" className={novoTipo === t.key ? 'text-white font-bold' : 'text-slate-600'}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Texto */}
            <Text variant="small" color="secondary" className="mb-2 font-semibold">O que você quer compartilhar?</Text>
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="Conte como está indo... a comunidade te apoia 🤝"
              placeholderTextColor="#94A3B8"
              value={novoTexto}
              onChangeText={setNovoTexto}
              className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-5"
              style={{ textAlignVertical: 'top', minHeight: 100 }}
              autoFocus
            />

            <Pressable
              onPress={compartilhar}
              className={`rounded-2xl py-4 items-center ${novoTexto.trim() ? 'bg-violet-600' : 'bg-violet-200'}`}
            >
              <Text className="text-white font-bold">Publicar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

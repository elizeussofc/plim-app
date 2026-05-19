import { Badge, Card, Text } from '@/components/ui';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const postsMock = [
  {
    id: '1',
    tipo: 'conquista',
    conteudo: 'Completei minha rotina matinal por 7 dias seguidos! Parece pequeno mas pra mim é enorme. 🥹',
    apelido: 'Ana',
    tempo: 'há 10 min',
    reacoes: { apoio: 12, forca: 5, parabens: 8 },
  },
  {
    id: '2',
    tipo: 'desafio',
    conteudo: 'Hoje foi difícil. Não consegui nem começar o que tinha planejado. Mas amanhã é outro dia.',
    apelido: 'Anônimo',
    tempo: 'há 1h',
    reacoes: { apoio: 24, forca: 18, parabens: 2 },
  },
];

const tipoLabels: Record<string, { label: string; variant: 'success' | 'energy' | 'primary' }> = {
  conquista: { label: '🏆 Conquista', variant: 'success' },
  desafio:   { label: '💪 Desafio', variant: 'energy' },
  texto:     { label: '💬 Texto', variant: 'primary' },
};

export default function ComunidadeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-6">
          <Text variant="h2" className="text-violet-800">Comunidade</Text>
          <View className="bg-violet-600 px-4 py-2 rounded-2xl">
            <Text variant="small" color="inverse" className="font-semibold">+ Compartilhar</Text>
          </View>
        </View>

        <Card variant="flat" padding="md" className="mb-5">
          <Text variant="small" color="secondary" className="text-center">
            🤝 Um lugar seguro. Sem julgamentos, sem competição.{'\n'}Só apoio de verdade.
          </Text>
        </Card>

        <View className="gap-4">
          {postsMock.map((post) => {
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

                <View className="flex-row gap-3 mt-4 pt-4 border-t border-slate-100">
                  <Text variant="small" color="secondary">🫂 {post.reacoes.apoio}</Text>
                  <Text variant="small" color="secondary">💪 {post.reacoes.forca}</Text>
                  <Text variant="small" color="secondary">🎉 {post.reacoes.parabens}</Text>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

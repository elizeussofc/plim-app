import { Badge, Card, Text } from '@/components/ui';
import { useUserStore } from '@/stores/userStore';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InicioScreen() {
  const profile = useUserStore((s) => s.profile);
  const apelido = profile?.apelido ?? profile?.nome ?? 'Viajante';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text variant="small" color="secondary">{saudacao} ✨</Text>
            <Text variant="h2" className="text-violet-800">{apelido}!</Text>
          </View>
          <View className="bg-violet-600 w-12 h-12 rounded-full items-center justify-center">
            <Text className="text-2xl">⚡</Text>
          </View>
        </View>

        {/* Mensagem do dia */}
        <Card variant="primary" padding="lg" className="mb-5">
          <Text variant="small" color="inverse" className="opacity-80 mb-1">💬 Mensagem do dia</Text>
          <Text color="inverse" className="text-base leading-6">
            Cada pequeno passo conta. Você não precisa fazer tudo hoje — só o próximo passo.
          </Text>
        </Card>

        {/* Próximo passo */}
        <Card variant="elevated" padding="lg" className="mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text variant="small" color="secondary" className="font-semibold uppercase tracking-wide">⚡ Próximo passo</Text>
            <Badge label="1 tarefa" variant="primary" />
          </View>
          <Text variant="h3" className="text-slate-800">Beber um copo de água</Text>
          <Text variant="small" color="muted" className="mt-1">Hidratação • Agora</Text>
        </Card>

        {/* Resumo do dia */}
        <Text variant="h3" className="mb-3">Hoje</Text>
        <View className="flex-row gap-3 mb-5">
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-3xl font-bold text-violet-600">0</Text>
            <Text variant="caption" color="secondary">Tarefas</Text>
          </Card>
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-3xl font-bold text-orange-500">0</Text>
            <Text variant="caption" color="secondary">Streak 🔥</Text>
          </Card>
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-3xl font-bold text-emerald-500">0</Text>
            <Text variant="caption" color="secondary">Moedas</Text>
          </Card>
        </View>

        {/* Atalhos rápidos */}
        <Text variant="h3" className="mb-3">Atalhos</Text>
        <View className="flex-row gap-3">
          <Card variant="default" padding="md" className="flex-1 items-center">
            <Text className="text-3xl mb-1">🧠</Text>
            <Text variant="caption" color="secondary" className="text-center">Despejo{'\n'}Mental</Text>
          </Card>
          <Card variant="default" padding="md" className="flex-1 items-center">
            <Text className="text-3xl mb-1">🎯</Text>
            <Text variant="caption" color="secondary" className="text-center">Sessão{'\n'}de Foco</Text>
          </Card>
          <Card variant="default" padding="md" className="flex-1 items-center">
            <Text className="text-3xl mb-1">😌</Text>
            <Text variant="caption" color="secondary" className="text-center">Modo{'\n'}Calma</Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

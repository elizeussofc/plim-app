import { Card, Text } from '@/components/ui';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const opcoes = [
  {
    route: '/despejo-mental',
    icone: '🧠',
    titulo: 'Despejo Mental',
    desc: 'Jogue seus pensamentos pra fora. Sem filtro, sem julgamento.',
    cor: 'bg-violet-100',
    corTexto: 'text-violet-700',
  },
  {
    route: '/sessao-foco',
    icone: '🎯',
    titulo: 'Sessão de Foco',
    desc: 'Timer Pomodoro. Cada minuto conta, mesmo que não seja perfeito.',
    cor: 'bg-orange-100',
    corTexto: 'text-orange-700',
  },
  {
    route: '/modo-calma',
    icone: '😌',
    titulo: 'Modo Calma',
    desc: 'Respira. Desacelera. Um passo de cada vez.',
    cor: 'bg-emerald-100',
    corTexto: 'text-emerald-700',
  },
];

export default function PlimScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-8 mt-2">
          <View className="w-20 h-20 rounded-full bg-violet-600 items-center justify-center mb-3 shadow-lg"
            style={{ shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10 }}>
            <Text className="text-4xl">⚡</Text>
          </View>
          <Text variant="h2" className="text-violet-800">Botão Plim</Text>
          <Text variant="small" color="secondary" className="text-center mt-1">
            Seu hub de foco. Escolha o modo certo pra agora.
          </Text>
        </View>

        <View className="gap-4">
          {opcoes.map((op) => (
            <Pressable
              key={op.route}
              onPress={() => router.push(op.route as any)}
              className="active:opacity-70"
            >
              <Card variant="elevated" padding="lg">
                <View className="flex-row items-center gap-4">
                  <View className={`w-16 h-16 rounded-3xl ${op.cor} items-center justify-center`}>
                    <Text className="text-3xl">{op.icone}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className={`font-bold text-lg ${op.corTexto}`}>{op.titulo}</Text>
                    <Text variant="small" color="secondary" className="mt-1 leading-5">{op.desc}</Text>
                  </View>
                  <Text className="text-slate-300 text-xl">›</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        <Card variant="flat" padding="md" className="mt-6">
          <Text variant="small" color="secondary" className="text-center leading-5">
            💡 <Text variant="small" className="font-semibold text-violet-700">Dica Plim:</Text>
            {' '}Não precisa fazer tudo hoje.{'\n'}Escolha uma coisa. Comece agora.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

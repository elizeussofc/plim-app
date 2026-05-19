import { Card, Text } from '@/components/ui';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const principal = [
  { route: '/despejo-mental', icone: '🧠', titulo: 'Despejo Mental',   desc: 'Jogue seus pensamentos pra fora. Sem filtro.',        cor: 'bg-violet-100', corTexto: 'text-violet-700' },
  { route: '/sessao-foco',    icone: '🎯', titulo: 'Sessão de Foco',   desc: 'Timer Pomodoro. Cada minuto conta.',                 cor: 'bg-orange-100', corTexto: 'text-orange-700' },
  { route: '/modo-calma',     icone: '😌', titulo: 'Modo Calma',       desc: 'Respira. Desacelera. Um passo de cada vez.',         cor: 'bg-emerald-100', corTexto: 'text-emerald-700' },
  { route: '/ia-tdah',        icone: '🤖', titulo: 'Plim IA',          desc: 'Assistente especializado em TDAH. Converse agora.',  cor: 'bg-blue-100',   corTexto: 'text-blue-700' },
];

const extras = [
  { route: '/medicacao', icone: '💊', titulo: 'Medicação',    desc: 'Lembretes e histórico' },
  { route: '/historico', icone: '📊', titulo: 'Histórico',    desc: 'Heatmap da rotina'     },
  { route: '/parceiro',  icone: '👫', titulo: 'Parceiro',     desc: 'Acompanhe juntos'      },
  { route: '/ranking',   icone: '🏆', titulo: 'Ranking',      desc: 'Competição ao vivo'    },
];

export default function PlimScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        <View className="items-center mb-6 mt-2">
          <View className="w-20 h-20 rounded-full bg-violet-600 items-center justify-center mb-3 shadow-lg"
            style={{ shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10 }}>
            <Text className="text-4xl">⚡</Text>
          </View>
          <Text variant="h2" className="text-violet-800">Botão Plim</Text>
          <Text variant="small" color="secondary" className="text-center mt-1">Seu hub de foco e ferramentas</Text>
        </View>

        {/* Modos principais */}
        <View className="gap-3 mb-5">
          {principal.map((op) => (
            <Pressable key={op.route} onPress={() => router.push(op.route as any)} className="active:opacity-70">
              <Card variant="elevated" padding="lg">
                <View className="flex-row items-center gap-4">
                  <View className={`w-14 h-14 rounded-3xl ${op.cor} items-center justify-center`}>
                    <Text className="text-2xl">{op.icone}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className={`font-bold text-base ${op.corTexto}`}>{op.titulo}</Text>
                    <Text variant="small" color="secondary" className="mt-0.5">{op.desc}</Text>
                  </View>
                  <Text className="text-slate-300 text-xl">›</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* Ferramentas extras */}
        <Text variant="h3" className="mb-3">Ferramentas</Text>
        <View className="flex-row flex-wrap gap-3">
          {extras.map((e) => (
            <Pressable key={e.route} onPress={() => router.push(e.route as any)} className="active:opacity-70" style={{ width: '47%' }}>
              <Card variant="default" padding="md" className="items-center">
                <Text className="text-3xl mb-1">{e.icone}</Text>
                <Text className="font-semibold text-slate-800 text-sm">{e.titulo}</Text>
                <Text variant="caption" color="secondary">{e.desc}</Text>
              </Card>
            </Pressable>
          ))}
        </View>

        <Card variant="flat" padding="md" className="mt-5">
          <Text variant="small" color="secondary" className="text-center leading-5">
            💡 <Text variant="small" className="font-semibold text-violet-700">Dica Plim:</Text>
            {' '}Não precisa fazer tudo hoje.{'\n'}Escolha uma coisa. Comece agora.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

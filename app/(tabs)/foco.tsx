import { Card, Text } from '@/components/ui';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const principal = [
  { route: '/despejo-mental', icone: '🧠', titulo: 'Despejo Mental', desc: 'Jogue seus pensamentos pra fora. Sem filtro.',       cor: 'bg-violet-100', corTexto: 'text-violet-700', premium: false },
  { route: '/sessao-foco',    icone: '🎯', titulo: 'Sessão de Foco', desc: 'Timer Pomodoro. Cada minuto conta.',                cor: 'bg-orange-100', corTexto: 'text-orange-700', premium: false },
  { route: '/modo-calma',     icone: '😌', titulo: 'Modo Calma',     desc: 'Respira. Desacelera. Um passo de cada vez.',        cor: 'bg-emerald-100', corTexto: 'text-emerald-700', premium: false },
  { route: '/ia-tdah',        icone: '🤖', titulo: 'Plim IA',        desc: 'Assistente especializado em TDAH. Converse agora.', cor: 'bg-blue-100',   corTexto: 'text-blue-700',   premium: true },
];

const extras = [
  { route: '/medicacao', icone: '💊', titulo: 'Medicação', desc: 'Lembretes e histórico', premium: false },
  { route: '/historico', icone: '📊', titulo: 'Histórico', desc: 'Heatmap da rotina',     premium: false },
  { route: '/parceiro',  icone: '👫', titulo: 'Parceiro',  desc: 'Acompanhe juntos',      premium: true  },
  { route: '/ranking',   icone: '🏆', titulo: 'Ranking',   desc: 'Competição ao vivo',    premium: false },
];

export default function PlimScreen() {
  const router = useRouter();
  const isPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);

  function navegar(route: string, premium: boolean, nome: string) {
    if (premium && !isPro) {
      abrirPaywall(nome);
      return;
    }
    router.push(route as any);
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView
        style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-6 mt-2">
          <View
            className="w-20 h-20 rounded-full bg-violet-600 items-center justify-center mb-3"
            style={{ shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10 }}
          >
            <Text className="text-4xl">⚡</Text>
          </View>
          <Text variant="h2" className="text-violet-800">Botão Plim</Text>
          <Text variant="small" color="secondary" className="text-center mt-1">Seu hub de foco e ferramentas</Text>
        </View>

        {/* Modos principais */}
        <View className="gap-3 mb-5">
          {principal.map((op) => {
            const bloqueado = op.premium && !isPro;
            return (
              <Pressable
                key={op.route}
                onPress={() => navegar(op.route, op.premium, op.titulo)}
                className="active:opacity-70"
              >
                <Card variant="elevated" padding="lg">
                  <View className="flex-row items-center gap-4">
                    <View className={`w-14 h-14 rounded-3xl ${op.cor} items-center justify-center`}>
                      <Text className="text-2xl">{op.icone}</Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className={`font-bold text-base ${op.corTexto}`}>{op.titulo}</Text>
                        {bloqueado && (
                          <View style={{ backgroundColor: '#F97316', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>👑 PRO</Text>
                          </View>
                        )}
                      </View>
                      <Text variant="small" color="secondary" className="mt-0.5">{op.desc}</Text>
                    </View>
                    <Text className="text-slate-300 text-xl">{bloqueado ? '🔒' : '›'}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {/* Ferramentas extras */}
        <Text variant="h3" className="mb-3">Ferramentas</Text>
        <View className="flex-row flex-wrap gap-3">
          {extras.map((e) => {
            const bloqueado = e.premium && !isPro;
            return (
              <Pressable
                key={e.route}
                onPress={() => navegar(e.route, e.premium, e.titulo)}
                className="active:opacity-70"
                style={{ width: '47%' }}
              >
                <Card variant="default" padding="md" className="items-center">
                  <View style={{ position: 'relative' }}>
                    <Text className="text-3xl mb-1">{e.icone}</Text>
                    {bloqueado && (
                      <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 8, color: '#fff', fontWeight: '800' }}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text className="font-semibold text-slate-800 text-sm">{e.titulo}</Text>
                  <Text variant="caption" color="secondary">{e.desc}</Text>
                </Card>
              </Pressable>
            );
          })}
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

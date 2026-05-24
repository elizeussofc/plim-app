import { C } from '@/lib/theme';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';

const principal = [
  { route: '/despejo-mental', icone: '🧠', titulo: 'Despejo Mental', desc: 'Jogue seus pensamentos pra fora. Sem filtro.', cor: C.primary,  premium: false },
  { route: '/sessao-foco',    icone: '🎯', titulo: 'Sessão de Foco', desc: 'Timer Pomodoro. Cada minuto conta.',           cor: C.accent,   premium: false },
  { route: '/modo-calma',     icone: '😌', titulo: 'Modo Calma',     desc: 'Respira. Desacelera. Um passo de cada vez.',  cor: C.success,  premium: false },
  { route: '/ia-tdah',        icone: '🤖', titulo: 'Plim IA',        desc: 'Assistente especializado em TDAH.',           cor: '#3B82F6',  premium: true  },
];

const extras = [
  { route: '/medicacao', icone: '💊', titulo: 'Medicação', desc: 'Lembretes e histórico', premium: false, cor: '#EC4899' },
  { route: '/historico', icone: '📊', titulo: 'Histórico', desc: 'Heatmap da rotina',     premium: false, cor: '#8B5CF6' },
  { route: '/parceiro',  icone: '👫', titulo: 'Parceiro',  desc: 'Acompanhe juntos',      premium: true,  cor: '#F59E0B' },
  { route: '/ranking',   icone: '🏆', titulo: 'Ranking',   desc: 'Competição ao vivo',    premium: false, cor: '#EF4444' },
];

function PrincipalCard({ item, onPress, delay }: { item: typeof principal[0]; onPress: () => void; delay: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function press() {
    scale.value = withSpring(0.96, { damping: 15 }, () => { scale.value = withSpring(1); });
    onPress();
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={animStyle}>
      <Pressable onPress={press} style={{
        backgroundColor: C.surface,
        borderRadius: 20,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 10,
      }}>
        <View style={{
          width: 56, height: 56, borderRadius: 18,
          backgroundColor: item.cor + '22',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: item.cor + '44',
        }}>
          <Text style={{ fontSize: 26 }}>{item.icone}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>{item.titulo}</Text>
            {item.premium && (
              <View style={{ backgroundColor: C.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>👑 PRO</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: C.textSub }}>{item.desc}</Text>
        </View>
        <Text style={{ color: C.textMuted, fontSize: 20 }}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

function ExtraCard({ item, onPress, delay }: { item: typeof extras[0]; onPress: () => void; delay: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function press() {
    scale.value = withSpring(0.92, { damping: 15 }, () => { scale.value = withSpring(1); });
    onPress();
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[animStyle, { width: '47%' }]}>
      <Pressable onPress={press} style={{
        backgroundColor: C.surface,
        borderRadius: 18,
        padding: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: C.border,
      }}>
        <View style={{ position: 'relative', marginBottom: 10 }}>
          <Text style={{ fontSize: 30 }}>{item.icone}</Text>
          {item.premium && (
            <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 }}>
              <Text style={{ fontSize: 8, color: '#fff', fontWeight: '800' }}>PRO</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 }}>{item.titulo}</Text>
        <Text style={{ fontSize: 11, color: C.textSub }}>{item.desc}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function PlimScreen() {
  const router     = useRouter();
  const isPro      = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);

  function navegar(route: string, premium: boolean, nome: string) {
    if (premium && !isPro) { abrirPaywall(nome); return; }
    router.push(route as any);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(0).springify()} style={{ alignItems: 'center', marginBottom: 28, marginTop: 8 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 28,
            backgroundColor: C.primary + '22',
            alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            borderWidth: 1.5, borderColor: C.primaryLight + '55',
            shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
          }}>
            <Text style={{ fontSize: 38 }}>⚡</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>botão plim</Text>
          <Text style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>seu hub de foco e ferramentas</Text>
        </Animated.View>

        {/* Modos principais */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>modos principais</Text>
        {principal.map((op, i) => (
          <PrincipalCard key={op.route} item={op} delay={80 + i * 60} onPress={() => navegar(op.route, op.premium, op.titulo)} />
        ))}

        {/* Ferramentas */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 10, marginBottom: 14 }}>ferramentas</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {extras.map((e, i) => (
            <ExtraCard key={e.route} item={e} delay={340 + i * 50} onPress={() => navegar(e.route, e.premium, e.titulo)} />
          ))}
        </View>

        {/* Dica */}
        <Animated.View entering={FadeInDown.delay(560).springify()} style={{
          backgroundColor: C.surface, borderRadius: 18, padding: 18, marginTop: 20,
          borderWidth: 1, borderColor: C.primaryLight + '22',
        }}>
          <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 }}>
            💡 <Text style={{ fontWeight: '700', color: C.primaryLight }}>dica plim: </Text>
            não precisa fazer tudo hoje.{'\n'}escolha uma coisa. comece agora.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

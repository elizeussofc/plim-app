import AvatarPersonagem from '@/components/AvatarPersonagem';
import TermometroRotina, { calcularScoreRotina, expressaoDoScore } from '@/components/TermometroRotina';
import { C } from '@/lib/theme';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { useRotinaStore } from '@/stores/rotinaStore';
import { loadOnboardingProfile, type Chronotype, type PlimUserProfile } from '@/stores/onboardingStore';
import { getMensagemDoDia } from '@/lib/mensagensDoDia';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const atalhos = [
  { icone: '🧠', label: 'Despejo', sub: 'mental',  route: '/despejo-mental', color: '#7C3AED' },
  { icone: '🎯', label: 'Sessão',  sub: 'de foco', route: '/sessao-foco',    color: '#F97316' },
  { icone: '😌', label: 'Modo',    sub: 'calma',   route: '/modo-calma',     color: '#10B981' },
  { icone: '🤖', label: 'Plim',    sub: 'IA',      route: '/ia-tdah',        color: '#FBBF24' },
];

const SUGESTAO_FOCO: Record<Chronotype, { texto: string; horario: string }> = {
  morning:   { texto: 'Seu pico é pela manhã',    horario: '8h'  },
  afternoon: { texto: 'Seu pico é à tarde',       horario: '14h' },
  night:     { texto: 'Seu pico é à noite',       horario: '20h' },
  dawn:      { texto: 'Madrugada produtiva',      horario: '1h'  },
};

function StatCard({ value, label, color, delay }: { value: string | number; label: string; color: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ flex: 1 }}>
      <View style={{
        backgroundColor: C.surfaceHigh,
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: C.border,
      }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color, letterSpacing: -0.5 }}>{value}</Text>
        <Text style={{ fontSize: 11, color: C.textSub, marginTop: 2, fontWeight: '500' }}>{label}</Text>
      </View>
    </Animated.View>
  );
}

function AtalhoCard({ icone, label, sub, route, color, delay }: typeof atalhos[0] & { delay: number }) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function onPress() {
    scale.value = withSpring(0.92, { damping: 15 }, () => { scale.value = withSpring(1); });
    router.push(route as any);
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={animStyle}>
      <Pressable
        onPress={onPress}
        accessibilityLabel={`${label} ${sub}`}
        accessibilityRole="button"
        android_ripple={{ color: color + '33', borderless: false }}
        style={{
          backgroundColor: C.surfaceHigh,
          borderRadius: 18,
          padding: 16,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: C.border,
          width: '100%',
        }}
      >
        <View style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          backgroundColor: color + '22',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
          borderWidth: 1,
          borderColor: color + '44',
        }}>
          <Text style={{ fontSize: 22 }}>{icone}</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{label}</Text>
        <Text style={{ fontSize: 10, color: C.textSub }}>{sub}</Text>
      </Pressable>
    </Animated.View>
  );
}

function DesafioCard({ desafio, delay }: { desafio: any; delay: number }) {
  const progPct = Math.round((desafio.progresso / desafio.meta) * 100);
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withTiming(progPct, { duration: 900 });
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%` as any,
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <View style={{
        backgroundColor: C.surfaceHigh,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        marginBottom: 10,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: C.primary + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 18 }}>{desafio.icone}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{desafio.titulo}</Text>
            <Text style={{ fontSize: 10, color: C.textSub, marginTop: 1 }}>{desafio.progresso}/{desafio.meta} concluídos</Text>
          </View>
          <View style={{
            backgroundColor: C.primary + '22',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryLight }}>+{desafio.xp} XP</Text>
          </View>
        </View>
        <View style={{ backgroundColor: C.border, borderRadius: 4, height: 4, overflow: 'hidden' }}>
          <Animated.View style={[{ height: 4, borderRadius: 4, backgroundColor: C.primaryLight }, barStyle]} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function InicioScreen() {
  const router  = useRouter();
  const profile = useUserStore((s) => s.profile);
  const tarefas = useRotinaStore((s) => s.tarefas);
  const desafios = useDesafiosStore((s) => s.desafios);

  const [plimProfile, setPlimProfile] = useState<PlimUserProfile | null>(null);
  useEffect(() => { loadOnboardingProfile().then(setPlimProfile); }, []);

  const apelido     = plimProfile?.profileType.name ?? profile?.apelido ?? profile?.nome ?? 'Viajante';
  const perfilEmoji = plimProfile?.profileType.emoji ?? '✨';
  const hora        = new Date().getHours();
  const saudacao    = hora < 12 ? 'bom dia' : hora < 18 ? 'boa tarde' : 'boa noite';
  const mensagemDoDia = getMensagemDoDia(plimProfile?.profileType.id ?? 'explorador');
  const cronotipo   = plimProfile?.answers.chronotype ?? null;
  const sugestaoFoco = cronotipo ? SUGESTAO_FOCO[cronotipo] : null;

  const xpProxNivel = profile.nivel * 100;
  const xpPct       = Math.min(profile.xp_total / xpProxNivel, 1);

  const desafiosAtivos    = desafios.filter((d) => !d.completo);
  const desafiosCompletos = desafios.filter((d) => d.completo).length;

  const score     = calcularScoreRotina(tarefas, profile.streak, profile.xp_total);
  const expressao = expressaoDoScore(score);

  const xpBarWidth = useSharedValue(0);
  useEffect(() => {
    xpBarWidth.value = withTiming(xpPct * 100, { duration: 1000 });
  }, [xpPct]);
  const xpBarStyle = useAnimatedStyle(() => ({ width: `${xpBarWidth.value}%` as any }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(0).springify()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 13, color: C.textSub, fontWeight: '500' }}>{saudacao} {perfilEmoji}</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 }} numberOfLines={1} adjustsFontSizeToFit>
              {apelido}!
            </Text>
          </View>
          <Pressable
          onPress={() => router.push('/(tabs)/perfil')}
          accessibilityLabel="Ver meu perfil"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <View style={{ width: 52, height: 52, borderRadius: 26, overflow: 'hidden', borderWidth: 2, borderColor: C.primaryLight + '55' }}>
              <AvatarPersonagem config={profile.avatar_config} expressao={expressao} size={52} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Mensagem do dia */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={{
          backgroundColor: C.primary,
          borderRadius: 20,
          padding: 18,
          marginBottom: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(167,139,250,0.3)',
        }}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: C.accent, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }} />
          <Text style={{ position: 'absolute', right: -10, bottom: -18, fontSize: 80, opacity: 0.1 }}>{perfilEmoji}</Text>
          <View style={{ paddingLeft: 10 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 }}>
              💬 MENSAGEM DO DIA
            </Text>
            <Text style={{ color: C.text, fontSize: 14, lineHeight: 22, fontStyle: 'italic', fontWeight: '500' }}>
              {mensagemDoDia}
            </Text>
          </View>
        </Animated.View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <StatCard value={profile.xp_total} label="XP total"     color={C.primaryLight} delay={120} />
          <StatCard value={profile.streak}   label="streak 🔥"    color={C.accent}       delay={160} />
          <StatCard value={profile.moedas}   label="moedas 🪙"    color={C.gold}         delay={200} />
        </View>

        {/* XP Bar */}
        <Animated.View entering={FadeInDown.delay(220).springify()} style={{
          backgroundColor: C.surfaceHigh,
          borderRadius: 16,
          padding: 14,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: C.border,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: C.textSub, fontWeight: '600' }}>nível {profile.nivel}</Text>
            <Text style={{ fontSize: 12, color: C.primaryLight, fontWeight: '700' }}>{profile.xp_total}/{xpProxNivel} XP</Text>
          </View>
          <View style={{ backgroundColor: C.border, borderRadius: 6, height: 6, overflow: 'hidden' }}>
            <Animated.View style={[{ height: 6, borderRadius: 6, backgroundColor: C.primaryLight, shadowColor: C.primary, shadowOpacity: 0.7, shadowRadius: 4, elevation: 4 }, xpBarStyle]} />
          </View>
        </Animated.View>

        {/* Termômetro */}
        <Animated.View entering={FadeInDown.delay(260).springify()} style={{ marginBottom: 20 }}>
          <TermometroRotina />
        </Animated.View>

        {/* Sugestão cronotipo */}
        {sugestaoFoco && (
          <Animated.View entering={FadeInDown.delay(280).springify()} style={{
            backgroundColor: C.surfaceHigh,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: C.accent + '33',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.accent }}>💡 {sugestaoFoco.texto}</Text>
              <Text style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>Que tal agendar foco às {sugestaoFoco.horario}?</Text>
            </View>
            <Pressable
              onPress={() => router.push('/sessao-foco')}
              accessibilityLabel="Iniciar sessão de foco"
              accessibilityRole="button"
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
              style={{ backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginLeft: 12, minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Iniciar</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Atalhos rápidos */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={{ marginBottom: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.5, marginBottom: 14, textTransform: 'uppercase' }}>
            atalhos rápidos
          </Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {atalhos.map((a, i) => (
            <View key={a.route} style={{ flex: 1 }}>
              <AtalhoCard {...a} delay={320 + i * 40} />
            </View>
          ))}
        </View>

        {/* Desafios da semana */}
        <Animated.View entering={FadeInDown.delay(440).springify()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            desafios da semana
          </Text>
          <View style={{
            backgroundColor: desafiosCompletos === 5 ? C.success + '22' : C.primary + '22',
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: desafiosCompletos === 5 ? C.success : C.primaryLight }}>
              {desafiosCompletos}/5
            </Text>
          </View>
        </Animated.View>

        {desafiosAtivos.slice(0, 2).map((d, i) => (
          <DesafioCard key={d.id} desafio={d} delay={480 + i * 60} />
        ))}

        {desafiosAtivos.length === 0 && (
          <Animated.View entering={FadeInDown.delay(480).springify()} style={{
            backgroundColor: C.surfaceHigh,
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: C.success + '33',
          }}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>🏆</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.success }}>Todos os desafios completos!</Text>
          </Animated.View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

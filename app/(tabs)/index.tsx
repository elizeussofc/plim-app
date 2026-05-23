import { Badge, Card, Text } from '@/components/ui';
import AvatarPersonagem from '@/components/AvatarPersonagem';
import TermometroRotina, { calcularScoreRotina, expressaoDoScore } from '@/components/TermometroRotina';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { useUserStore } from '@/stores/userStore';
import { useRotinaStore } from '@/stores/rotinaStore';
import { loadOnboardingProfile, type Chronotype, type PlimUserProfile } from '@/stores/onboardingStore';
import { getMensagemDoDia } from '@/lib/mensagensDoDia';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const atalhos = [
  { icone: '🧠', label: 'Despejo\nMental',  route: '/despejo-mental' },
  { icone: '🎯', label: 'Sessão\nde Foco',  route: '/sessao-foco'    },
  { icone: '😌', label: 'Modo\nCalma',      route: '/modo-calma'     },
  { icone: '🤖', label: 'Plim\nIA',         route: '/ia-tdah'        },
];

const SUGESTAO_FOCO: Record<Chronotype, { texto: string; horario: string }> = {
  morning:   { texto: 'Seu pico é pela manhã.',         horario: '8h'  },
  afternoon: { texto: 'Seu pico é à tarde.',            horario: '14h' },
  night:     { texto: 'Seu pico é à noite.',            horario: '20h' },
  dawn:      { texto: 'Sua madrugada é produtiva.',     horario: '1h'  },
};

export default function InicioScreen() {
  const router   = useRouter();
  const profile  = useUserStore((s) => s.profile);
  const tarefas  = useRotinaStore((s) => s.tarefas);
  const desafios = useDesafiosStore((s) => s.desafios);

  const [plimProfile, setPlimProfile] = useState<PlimUserProfile | null>(null);
  useEffect(() => { loadOnboardingProfile().then(setPlimProfile); }, []);

  // Ajuste 1 — saudação personalizada com nome E emoji do perfil
  const apelido       = plimProfile?.profileType.name ?? profile?.apelido ?? profile?.nome ?? 'Viajante';
  const perfilEmoji   = plimProfile?.profileType.emoji ?? '✨';
  const hora          = new Date().getHours();
  const saudacao      = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  // Ajuste 2 — mensagem do dia personalizada por perfil
  const mensagemDoDia = getMensagemDoDia(plimProfile?.profileType.id ?? 'explorador');

  // Ajuste 3 — sugestão de foco baseada no cronotipo
  const cronotipo     = plimProfile?.answers.chronotype ?? null;
  const sugestaoFoco  = cronotipo ? SUGESTAO_FOCO[cronotipo] : null;

  const xpProxNivel  = profile.nivel * 100;
  const xpProgresso  = Math.min(profile.xp_total / xpProxNivel, 1);

  const desafiosAtivos    = desafios.filter((d) => !d.completo);
  const desafiosCompletos = desafios.filter((d) => d.completo).length;

  const score    = calcularScoreRotina(tarefas, profile.streak, profile.xp_total);
  const expressao = expressaoDoScore(score);

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Cabeçalho — Ajuste 1 */}
        <View className="flex-row items-center justify-between mb-6">
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text variant="small" color="secondary">{saudacao} {perfilEmoji}</Text>
            <Text variant="h2" className="text-violet-800" numberOfLines={1} adjustsFontSizeToFit>
              {apelido}!
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/perfil')}
            className="active:opacity-70"
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#EDE9FE',
                overflow: 'hidden',
                alignItems: 'center',
              }}
            >
              <View style={{ marginTop: -6 }}>
                <AvatarPersonagem
                  config={profile.avatar_config}
                  expressao={expressao}
                  size={68}
                />
              </View>
            </View>
          </Pressable>
        </View>

        {/* Mensagem do dia — Ajuste 2 */}
        <Card variant="primary" padding="lg" className="mb-5">
          <Text variant="small" color="inverse" className="opacity-80 mb-1">💬 Mensagem do dia</Text>
          <Text color="inverse" className="text-base leading-6">
            {mensagemDoDia}
          </Text>
        </Card>

        {/* Termômetro da rotina */}
        <TermometroRotina />

        {/* Sugestão de foco — Ajuste 3 */}
        {sugestaoFoco && (
          <Card variant="flat" padding="md" className="mb-4 border border-violet-100">
            <View className="flex-row items-center justify-between">
              <View style={{ flex: 1 }}>
                <Text variant="small" className="text-violet-700 font-semibold mb-0.5">
                  💡 {sugestaoFoco.texto}
                </Text>
                <Text variant="caption" color="secondary">
                  Que tal agendar foco às {sugestaoFoco.horario}?
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/sessao-foco')}
                className="active:opacity-70"
                style={{
                  backgroundColor: '#7C3AED',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginLeft: 12,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                  Iniciar agora
                </Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Stats + XP */}
        <View className="flex-row gap-3 mb-4">
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-violet-600">{profile.xp_total}</Text>
            <Text variant="caption" color="secondary">XP</Text>
          </Card>
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-orange-500">{profile.streak}</Text>
            <Text variant="caption" color="secondary">Streak 🔥</Text>
          </Card>
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-emerald-500">{profile.moedas}</Text>
            <Text variant="caption" color="secondary">🪙 Moedas</Text>
          </Card>
        </View>

        <Card variant="default" padding="md" className="mb-5">
          <View className="flex-row justify-between mb-1.5">
            <Text variant="small" color="secondary">Nível {profile.nivel}</Text>
            <Text variant="small" className="text-violet-600 font-semibold">{profile.xp_total}/{xpProxNivel} XP</Text>
          </View>
          <View className="bg-slate-100 rounded-full h-2">
            <View className="bg-violet-500 h-2 rounded-full" style={{ width: `${Math.round(xpProgresso * 100)}%` as any }} />
          </View>
        </Card>

        {/* Desafios semanais */}
        <View className="flex-row items-center justify-between mb-3">
          <Text variant="h3">Desafios da semana</Text>
          <Badge label={`${desafiosCompletos}/5`} variant={desafiosCompletos === 5 ? 'success' : 'primary'} />
        </View>
        <View className="gap-2 mb-5">
          {desafiosAtivos.slice(0, 3).map((d) => (
            <Card key={d.id} variant="flat" padding="md">
              <View className="flex-row items-center gap-3">
                <Text className="text-xl">{d.icone}</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800 text-sm">{d.titulo}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="flex-1 bg-slate-200 rounded-full h-1.5">
                      <View
                        className="bg-violet-500 h-1.5 rounded-full"
                        style={{ width: `${Math.round((d.progresso / d.meta) * 100)}%` as any }}
                      />
                    </View>
                    <Text style={{ fontSize: 10, color: '#94A3B8' }}>{d.progresso}/{d.meta}</Text>
                  </View>
                </View>
                <Text variant="caption" className="text-violet-600 font-semibold">+{d.xp} XP</Text>
              </View>
            </Card>
          ))}
          {desafiosAtivos.length === 0 && (
            <Card variant="flat" padding="md" className="items-center">
              <Text className="text-2xl mb-1">🏆</Text>
              <Text variant="small" className="text-violet-600 font-semibold">Todos os desafios completos!</Text>
            </Card>
          )}
        </View>

        {/* Atalhos rápidos */}
        <Text variant="h3" className="mb-3">Atalhos rápidos</Text>
        <View className="flex-row flex-wrap gap-3">
          {atalhos.map((a) => (
            <Pressable key={a.route} onPress={() => router.push(a.route as any)} className="active:opacity-70" style={{ width: '22%' }}>
              <Card variant="default" padding="md" className="items-center">
                <Text className="text-2xl mb-1">{a.icone}</Text>
                <Text style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{a.label}</Text>
              </Card>
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

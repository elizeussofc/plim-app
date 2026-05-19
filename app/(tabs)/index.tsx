import { Badge, Card, Text } from '@/components/ui';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const atalhos = [
  { icone: '🧠', label: 'Despejo\nMental', route: '/despejo-mental' },
  { icone: '🎯', label: 'Sessão\nde Foco', route: '/sessao-foco' },
  { icone: '😌', label: 'Modo\nCalma', route: '/modo-calma' },
];

export default function InicioScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const apelido = profile?.apelido ?? profile?.nome ?? 'Viajante';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  const xpProxNivel = profile.nivel * 100;
  const xpProgresso = Math.min(profile.xp_total / xpProxNivel, 1);

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
          <Pressable onPress={() => router.push('/(tabs)/perfil')} className="bg-violet-600 w-12 h-12 rounded-full items-center justify-center active:opacity-70">
            <Text className="text-2xl">{profile.avatar_emoji}</Text>
          </Pressable>
        </View>

        {/* Mensagem do dia */}
        <Card variant="primary" padding="lg" className="mb-5">
          <Text variant="small" color="inverse" className="opacity-80 mb-1">💬 Mensagem do dia</Text>
          <Text color="inverse" className="text-base leading-6">
            Cada pequeno passo conta. Você não precisa fazer tudo hoje — só o próximo passo.
          </Text>
        </Card>

        {/* Stats */}
        <View className="flex-row gap-3 mb-5">
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

        {/* Barra XP */}
        <Card variant="default" padding="md" className="mb-5">
          <View className="flex-row justify-between mb-2">
            <Text variant="small" color="secondary">Nível {profile.nivel}</Text>
            <Text variant="small" className="text-violet-600 font-semibold">{profile.xp_total} / {xpProxNivel} XP</Text>
          </View>
          <View className="bg-slate-100 rounded-full h-2">
            <View
              className="bg-violet-500 h-2 rounded-full"
              style={{ width: `${Math.round(xpProgresso * 100)}%` as any }}
            />
          </View>
        </Card>

        {/* Próximo passo */}
        <Card variant="elevated" padding="lg" className="mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text variant="small" color="secondary" className="font-semibold uppercase tracking-wide">⚡ Próximo passo</Text>
            <Badge label="Rotina" variant="primary" />
          </View>
          <Pressable onPress={() => router.push('/(tabs)/rotina')} className="active:opacity-70">
            <Text variant="h3" className="text-slate-800">Ver minha rotina de hoje</Text>
            <Text variant="small" color="muted" className="mt-1">Toque para abrir →</Text>
          </Pressable>
        </Card>

        {/* Atalhos rápidos */}
        <Text variant="h3" className="mb-3">Atalhos rápidos</Text>
        <View className="flex-row gap-3">
          {atalhos.map((a) => (
            <Pressable
              key={a.route}
              onPress={() => router.push(a.route as any)}
              className="flex-1 active:opacity-70"
            >
              <Card variant="default" padding="md" className="items-center">
                <Text className="text-3xl mb-1">{a.icone}</Text>
                <Text variant="caption" color="secondary" className="text-center">{a.label}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

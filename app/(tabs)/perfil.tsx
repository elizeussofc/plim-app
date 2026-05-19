import { Badge, Button, Card, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const conquistas = [
  { icone: '⚡', nome: 'Primeiro Passo', desc: 'Completou a primeira tarefa' },
  { icone: '🔥', nome: '3 Dias Seguidos', desc: 'Streak de 3 dias', bloqueado: true },
  { icone: '🏆', nome: 'Semana Perfeita', desc: '7 dias completos', bloqueado: true },
];

export default function PerfilScreen() {
  const session = useAuthStore((s) => s.session);
  const router = useRouter();

  const nome = session?.user?.user_metadata?.nome ?? 'Explorador';
  const nivel = 1;
  const xp = 0;
  const moedas = 0;
  const xpProximoNivel = 100;

  async function sair() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-violet-600 items-center justify-center mb-3 shadow-lg" style={{ shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
            <Text className="text-5xl">⚡</Text>
          </View>
          <Text variant="h2" className="text-violet-800">{nome}</Text>
          <Badge label={`Nível ${nivel}`} variant="primary" />
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-5">
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-violet-600">{xp}</Text>
            <Text variant="caption" color="secondary">XP total</Text>
          </Card>
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-orange-500">🪙 {moedas}</Text>
            <Text variant="caption" color="secondary">Moedas</Text>
          </Card>
          <Card variant="flat" padding="md" className="flex-1 items-center">
            <Text className="text-2xl font-bold text-emerald-500">0 🔥</Text>
            <Text variant="caption" color="secondary">Streak</Text>
          </Card>
        </View>

        {/* Barra XP */}
        <Card variant="default" padding="md" className="mb-5">
          <View className="flex-row justify-between mb-2">
            <Text variant="small" color="secondary">Próximo nível</Text>
            <Text variant="small" className="text-violet-600 font-semibold">{xp} / {xpProximoNivel} XP</Text>
          </View>
          <View className="bg-slate-100 rounded-full h-3">
            <View className="bg-violet-500 h-3 rounded-full w-0" />
          </View>
        </Card>

        {/* Conquistas */}
        <Text variant="h3" className="mb-3">Conquistas</Text>
        <View className="gap-3 mb-6">
          {conquistas.map((c) => (
            <Card key={c.nome} variant="default" padding="md" className={c.bloqueado ? 'opacity-40' : ''}>
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 bg-violet-100 rounded-2xl items-center justify-center">
                  <Text className="text-2xl">{c.bloqueado ? '🔒' : c.icone}</Text>
                </View>
                <View>
                  <Text className="font-semibold text-slate-800">{c.nome}</Text>
                  <Text variant="small" color="secondary">{c.desc}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Plano Pro ou Login */}
        {!session ? (
          <Card variant="primary" padding="lg" className="mb-4">
            <Text color="inverse" className="font-bold text-lg mb-1">Crie sua conta grátis ✨</Text>
            <Text color="inverse" className="opacity-80 text-sm mb-4">
              Salve seu progresso e desbloqueie o Plim Pro
            </Text>
            <Button
              label="Criar conta / Entrar"
              variant="secondary"
              size="md"
              className="bg-white"
              onPress={() => router.push('/(auth)/login')}
            />
          </Card>
        ) : (
          <>
            <Card variant="primary" padding="lg" className="mb-4">
              <Text color="inverse" className="font-bold text-lg mb-1">Plano Grátis</Text>
              <Text color="inverse" className="opacity-80 text-sm mb-4">Desbloqueie tudo com o Plim Pro ✨</Text>
              <Button label="Ver planos Pro" variant="secondary" size="md" className="bg-white" />
            </Card>
            <Button label="Sair da conta" variant="ghost" onPress={sair} size="md" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

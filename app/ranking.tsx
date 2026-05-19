import { Card, Text } from '@/components/ui';
import { EntradaRanking, assinarRankingRealtime, buscarRanking } from '@/lib/ranking';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const medalhas = ['🥇', '🥈', '🥉'];

function corPosicao(pos: number) {
  if (pos === 1) return 'bg-yellow-50 border border-yellow-200';
  if (pos === 2) return 'bg-slate-50 border border-slate-200';
  if (pos === 3) return 'bg-orange-50 border border-orange-200';
  return 'bg-white border border-slate-100';
}

function corPontos(pos: number) {
  if (pos === 1) return 'text-yellow-600';
  if (pos === 2) return 'text-slate-500';
  if (pos === 3) return 'text-orange-500';
  return 'text-violet-600';
}

export default function RankingScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const profile = useUserStore((s) => s.profile);

  const [ranking, setRanking] = useState<EntradaRanking[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [piscou, setPiscou] = useState<string | null>(null);
  const piscouTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meuId = session?.user?.id ?? null;
  const minhaEntrada = ranking.find((r) => r.user_id === meuId);
  const minhaPosicao = minhaEntrada?.posicao ?? null;

  useEffect(() => {
    buscarRanking().then((data) => {
      setRanking(data);
      setCarregando(false);
    });

    const cancelar = assinarRankingRealtime((novoRanking) => {
      // Descobre quem mudou para piscar
      setRanking((anterior) => {
        const mudou = novoRanking.find((n) => {
          const ant = anterior.find((a) => a.user_id === n.user_id);
          return ant && ant.pontos !== n.pontos;
        });
        if (mudou) {
          setPiscou(mudou.user_id);
          if (piscouTimer.current) clearTimeout(piscouTimer.current);
          piscouTimer.current = setTimeout(() => setPiscou(null), 2000);
        }
        return novoRanking;
      });
      setUltimaAtualizacao(new Date());
    });

    return () => {
      cancelar();
      if (piscouTimer.current) clearTimeout(piscouTimer.current);
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-violet-100 bg-white">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <Text className="text-violet-600 font-semibold">← Voltar</Text>
        </Pressable>
        <View className="items-center">
          <Text variant="h3" className="text-violet-800">🏆 Ranking</Text>
          {ultimaAtualizacao && (
            <Text variant="caption" color="muted">
              ao vivo · {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Card do usuário atual (se estiver no ranking) */}
        {minhaPosicao && minhaEntrada && (
          <Card variant="primary" padding="md" className="mb-5">
            <Text variant="small" color="inverse" className="opacity-80 mb-1">Sua posição</Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-3xl font-bold text-white">#{minhaPosicao}</Text>
              <View className="flex-1">
                <Text className="text-white font-bold">{minhaEntrada.nome_exibido}</Text>
                <Text className="text-violet-200 text-sm">{minhaEntrada.pontos} pontos</Text>
              </View>
              <Text className="text-3xl">{minhaEntrada.avatar_emoji}</Text>
            </View>
          </Card>
        )}

        {/* Usuário anônimo sem conta */}
        {!session && (
          <Card variant="flat" padding="md" className="mb-5 border border-violet-200">
            <View className="flex-row items-center gap-3">
              <Text className="text-3xl">{profile.avatar_emoji}</Text>
              <View className="flex-1">
                <Text className="font-bold text-slate-800">Você (local)</Text>
                <Text variant="small" color="secondary">{profile.xp_total} XP · {profile.moedas} 🪙</Text>
              </View>
              <Pressable
                onPress={() => router.push('/(auth)/login')}
                className="bg-violet-600 px-3 py-1.5 rounded-full"
              >
                <Text className="text-white text-xs font-bold">Entrar no ranking</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Pódio top 3 */}
        {ranking.length >= 3 && (
          <View className="flex-row items-end justify-center gap-3 mb-6 mt-2">
            {/* 2º lugar */}
            <View className="items-center flex-1">
              <Text className="text-4xl mb-1">{ranking[1].avatar_emoji}</Text>
              <Text className="text-2xl">🥈</Text>
              <Text variant="small" className="font-bold text-slate-700 text-center mt-1" numberOfLines={1}>
                {ranking[1].nome_exibido}
              </Text>
              <Text variant="caption" className="text-slate-500">{ranking[1].pontos} pts</Text>
              <View className="bg-slate-200 h-16 w-full rounded-t-2xl mt-1" />
            </View>
            {/* 1º lugar */}
            <View className="items-center flex-1">
              <Text className="text-4xl mb-1">{ranking[0].avatar_emoji}</Text>
              <Text className="text-2xl">🥇</Text>
              <Text variant="small" className="font-bold text-violet-700 text-center mt-1" numberOfLines={1}>
                {ranking[0].nome_exibido}
              </Text>
              <Text variant="caption" className="text-violet-600 font-bold">{ranking[0].pontos} pts</Text>
              <View className="bg-violet-400 h-24 w-full rounded-t-2xl mt-1" />
            </View>
            {/* 3º lugar */}
            <View className="items-center flex-1">
              <Text className="text-4xl mb-1">{ranking[2].avatar_emoji}</Text>
              <Text className="text-2xl">🥉</Text>
              <Text variant="small" className="font-bold text-slate-700 text-center mt-1" numberOfLines={1}>
                {ranking[2].nome_exibido}
              </Text>
              <Text variant="caption" className="text-slate-500">{ranking[2].pontos} pts</Text>
              <View className="bg-orange-200 h-12 w-full rounded-t-2xl mt-1" />
            </View>
          </View>
        )}

        {/* Lista completa */}
        <Text variant="h3" className="mb-3">Classificação</Text>

        {carregando ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#7C3AED" size="large" />
            <Text variant="small" color="secondary" className="mt-3">Carregando ranking...</Text>
          </View>
        ) : ranking.length === 0 ? (
          <Card variant="flat" padding="lg" className="items-center">
            <Text className="text-4xl mb-3">🏁</Text>
            <Text className="font-bold text-slate-800 mb-1">Nenhum jogador ainda</Text>
            <Text variant="small" color="secondary" className="text-center">
              Complete sua rotina para entrar no ranking!
            </Text>
          </Card>
        ) : (
          <View className="gap-2">
            {ranking.map((entrada) => {
              const euSou = entrada.user_id === meuId;
              const estaPiscando = piscou === entrada.user_id;

              return (
                <View
                  key={entrada.user_id}
                  className={`flex-row items-center gap-3 px-4 py-3 rounded-2xl
                    ${euSou ? 'bg-violet-100 border-2 border-violet-400' : corPosicao(entrada.posicao ?? 99)}
                    ${estaPiscando ? 'opacity-60' : 'opacity-100'}`}
                >
                  {/* Posição */}
                  <View className="w-8 items-center">
                    {(entrada.posicao ?? 99) <= 3 ? (
                      <Text className="text-xl">{medalhas[(entrada.posicao ?? 1) - 1]}</Text>
                    ) : (
                      <Text className="text-slate-500 font-bold text-sm">#{entrada.posicao}</Text>
                    )}
                  </View>

                  {/* Avatar */}
                  <View className={`w-10 h-10 rounded-full items-center justify-center ${euSou ? 'bg-violet-300' : 'bg-slate-100'}`}>
                    <Text className="text-xl">{entrada.avatar_emoji}</Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <Text className={`font-semibold text-sm ${euSou ? 'text-violet-800' : 'text-slate-800'}`}>
                      {entrada.nome_exibido}{euSou ? ' (você)' : ''}
                    </Text>
                    <Text variant="caption" color="secondary">
                      Nível {entrada.nivel} · {entrada.streak} 🔥 · {entrada.tarefas_feitas}✓ {entrada.tarefas_puladas > 0 ? `${entrada.tarefas_puladas}✗` : ''}
                    </Text>
                  </View>

                  {/* Pontos */}
                  <View className="items-end">
                    <Text className={`font-bold text-base ${corPontos(entrada.posicao ?? 99)}`}>
                      {entrada.pontos}
                    </Text>
                    <Text variant="caption" color="muted">pts</Text>
                  </View>

                  {/* Indicador de mudança em tempo real */}
                  {estaPiscando && (
                    <Text className="text-emerald-500 text-xs font-bold">⬆</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Legenda de pontos */}
        <Card variant="flat" padding="md" className="mt-6">
          <Text variant="small" className="font-semibold text-slate-700 mb-2">Como os pontos funcionam</Text>
          <View className="gap-1">
            <Text variant="caption" color="secondary">✅ Tarefa feita → <Text className="text-violet-600 font-semibold">+10 pontos</Text></Text>
            <Text variant="caption" color="secondary">⏭ Tarefa pulada → <Text className="text-red-500 font-semibold">−5 pontos</Text></Text>
            <Text variant="caption" color="secondary">🎉 Rotina 100% → <Text className="text-emerald-600 font-semibold">+30 bônus</Text></Text>
            <Text variant="caption" color="secondary">🔥 Streak ativo → <Text className="text-orange-500 font-semibold">+5 por dia</Text></Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

import { Card, Text } from '@/components/ui';
import { EntradaRanking, assinarRankingRealtime, buscarRanking } from '@/lib/ranking';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ParceiroScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const meuId = session?.user?.id ?? null;
  const meuCodigo = meuId ? meuId.slice(0, 8).toUpperCase() : null;

  const [codigoInput, setCodigoInput] = useState('');
  const [parceiro, setParceiro] = useState<EntradaRanking | null>(null);
  const [carregandoParceiro, setCarregandoParceiro] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [parceiroIdSalvo, setParceiroIdSalvo] = useState<string | null>(null);

  // Carrega parceiro salvo no Supabase
  useEffect(() => {
    if (!meuId) return;
    supabase
      .from('parceiros')
      .select('parceiro_id')
      .eq('user_id', meuId)
      .single()
      .then(({ data }) => {
        if (data?.parceiro_id) {
          setParceiroIdSalvo(data.parceiro_id);
          buscarDadosParceiro(data.parceiro_id);
        }
      });
  }, [meuId]);

  // Realtime: atualiza stats do parceiro quando ele pontua
  useEffect(() => {
    if (!parceiroIdSalvo) return;
    const cancelar = assinarRankingRealtime(async () => {
      await buscarDadosParceiro(parceiroIdSalvo);
    });
    return cancelar;
  }, [parceiroIdSalvo]);

  async function buscarDadosParceiro(userId: string) {
    setCarregandoParceiro(true);
    const ranking = await buscarRanking();
    const entrada = ranking.find((r) => r.user_id.startsWith(userId.toLowerCase()));
    setParceiro(entrada ?? null);
    setCarregandoParceiro(false);
  }

  async function vincularParceiro() {
    const codigo = codigoInput.trim().toLowerCase();
    if (codigo.length < 6) {
      Alert.alert('Código inválido', 'Digite pelo menos 6 caracteres do código do seu parceiro.');
      return;
    }
    if (!meuId) return;

    setSalvando(true);
    const ranking = await buscarRanking();
    const entrada = ranking.find((r) => r.user_id.startsWith(codigo));

    if (!entrada) {
      Alert.alert('Parceiro não encontrado', 'Nenhum usuário com esse código foi encontrado no ranking. O parceiro precisa ter completado ao menos uma tarefa para aparecer.');
      setSalvando(false);
      return;
    }

    if (entrada.user_id === meuId) {
      Alert.alert('Ops!', 'Você não pode se adicionar como parceiro. Compartilhe seu código com outra pessoa.');
      setSalvando(false);
      return;
    }

    await supabase.from('parceiros').upsert({ user_id: meuId, parceiro_id: entrada.user_id }, { onConflict: 'user_id' });
    setParceiroIdSalvo(entrada.user_id);
    setParceiro(entrada);
    setCodigoInput('');
    setSalvando(false);
    Alert.alert('✅ Parceiro vinculado!', `Agora você acompanha o progresso de ${entrada.nome_exibido} em tempo real.`);
  }

  async function desvincular() {
    if (!meuId) return;
    Alert.alert('Remover parceiro', 'Quer parar de acompanhar este parceiro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          await supabase.from('parceiros').delete().eq('user_id', meuId);
          setParceiro(null);
          setParceiroIdSalvo(null);
        },
      },
    ]);
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-violet-50">
        <View className="flex-row items-center px-5 pt-4 pb-3 bg-white border-b border-violet-100">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 mr-2">
            <Text className="text-violet-600 font-semibold">← Voltar</Text>
          </Pressable>
          <Text variant="h3" className="flex-1 text-center text-violet-800">👫 Modo Parceiro</Text>
          <View style={{ width: 60 }} />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">👫</Text>
          <Text variant="h3" className="text-violet-800 text-center mb-2">Crie uma conta para usar o Modo Parceiro</Text>
          <Text variant="small" color="secondary" className="text-center mb-6 leading-5">
            Vincule-se a um amigo ou familiar para acompanharem o progresso de rotina um do outro em tempo real.
          </Text>
          <Pressable onPress={() => router.push('/(auth)/login')} className="bg-violet-600 px-8 py-4 rounded-2xl">
            <Text className="text-white font-bold">Criar conta grátis</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <View className="flex-row items-center px-5 pt-4 pb-3 bg-white border-b border-violet-100">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 mr-2">
          <Text className="text-violet-600 font-semibold">← Voltar</Text>
        </Pressable>
        <Text variant="h3" className="flex-1 text-center text-violet-800">👫 Modo Parceiro</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Meu código */}
        <Card variant="primary" padding="lg" className="mb-5">
          <Text color="inverse" className="opacity-80 text-sm mb-1">Seu código de parceiro</Text>
          <Text color="inverse" className="text-3xl font-bold tracking-widest mb-2">{meuCodigo}</Text>
          <Text color="inverse" className="opacity-70 text-xs">Compartilhe este código com quem quiser vincular</Text>
        </Card>

        {/* Parceiro atual */}
        {parceiro ? (
          <Card variant="elevated" padding="lg" className="mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text variant="h3" className="text-violet-800">Seu parceiro</Text>
              <View className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full bg-emerald-400" />
                <Text variant="caption" className="text-emerald-600">ao vivo</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4 mb-4">
              <View className="w-16 h-16 bg-violet-100 rounded-full items-center justify-center">
                <Text className="text-3xl">{parceiro.avatar_emoji}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-bold text-slate-800 text-lg">{parceiro.nome_exibido}</Text>
                <Text variant="small" color="secondary">Nível {parceiro.nivel} · {parceiro.streak} 🔥 streak</Text>
              </View>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-violet-50 rounded-2xl p-3 items-center">
                <Text className="text-xl font-bold text-violet-600">{parceiro.pontos}</Text>
                <Text variant="caption" color="secondary">pontos</Text>
              </View>
              <View className="flex-1 bg-emerald-50 rounded-2xl p-3 items-center">
                <Text className="text-xl font-bold text-emerald-600">{parceiro.tarefas_feitas}</Text>
                <Text variant="caption" color="secondary">feitas ✓</Text>
              </View>
              <View className="flex-1 bg-red-50 rounded-2xl p-3 items-center">
                <Text className="text-xl font-bold text-red-400">{parceiro.tarefas_puladas}</Text>
                <Text variant="caption" color="secondary">puladas ✗</Text>
              </View>
            </View>

            {carregandoParceiro && (
              <View className="flex-row items-center gap-2 mb-3">
                <ActivityIndicator size="small" color="#7C3AED" />
                <Text variant="caption" color="secondary">Atualizando...</Text>
              </View>
            )}

            <Pressable onPress={desvincular} className="border border-slate-200 rounded-2xl py-3 items-center">
              <Text variant="small" className="text-slate-400">Remover parceiro</Text>
            </Pressable>
          </Card>
        ) : (
          /* Vincular parceiro */
          <Card variant="default" padding="lg" className="mb-5">
            <Text variant="h3" className="text-slate-800 mb-1">Vincular parceiro</Text>
            <Text variant="small" color="secondary" className="mb-4 leading-5">
              Peça para seu amigo te passar o código de parceiro dele e cole aqui embaixo.
            </Text>
            <TextInput
              placeholder="Ex: A1B2C3D4"
              placeholderTextColor="#94A3B8"
              value={codigoInput}
              onChangeText={(t) => setCodigoInput(t.toUpperCase())}
              className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 mb-3 font-mono tracking-widest"
              autoCapitalize="characters"
              maxLength={8}
            />
            <Pressable
              onPress={vincularParceiro}
              disabled={salvando || codigoInput.trim().length < 6}
              className={`rounded-2xl py-4 items-center ${codigoInput.trim().length >= 6 && !salvando ? 'bg-violet-600' : 'bg-violet-200'}`}
            >
              {salvando
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-bold">Vincular parceiro</Text>
              }
            </Pressable>
          </Card>
        )}

        <Card variant="flat" padding="md">
          <Text variant="small" className="font-semibold text-slate-700 mb-2">Como funciona</Text>
          <View className="gap-1.5">
            <Text variant="caption" color="secondary">1. Compartilhe seu código com um amigo</Text>
            <Text variant="caption" color="secondary">2. Ele cola o seu código no app dele</Text>
            <Text variant="caption" color="secondary">3. Vocês veem o progresso um do outro em tempo real</Text>
            <Text variant="caption" color="secondary">4. Quando um completa a rotina, o outro recebe o destaque no ranking</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

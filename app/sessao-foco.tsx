import { Text } from '@/components/ui';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const duracoes = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '25 min', value: 25 },
  { label: '45 min', value: 45 },
];

function formatarTempo(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SessaoFocoScreen() {
  const router = useRouter();
  const [duracaoMin, setDuracaoMin] = useState(25);
  const [segundos, setSegundos] = useState(25 * 60);
  const [rodando, setRodando] = useState(false);
  const [completo, setCompleto] = useState(false);
  const totalSegundos = useRef(25 * 60);

  const addXp = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);
  const unlockConquista = useUserStore((s) => s.unlockConquista);

  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => {
      setSegundos((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setRodando(false);
          setCompleto(true);
          addXp(30);
          addMoedas(15);
          unlockConquista('foco_total');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rodando]);

  function selecionarDuracao(min: number) {
    if (rodando) return;
    setDuracaoMin(min);
    const s = min * 60;
    setSegundos(s);
    totalSegundos.current = s;
    setCompleto(false);
  }

  function iniciarPausar() {
    if (completo) return;
    setRodando((v) => !v);
  }

  function encerrar() {
    const minutosFeitos = Math.floor((totalSegundos.current - segundos) / 60);
    if (minutosFeitos >= 1) {
      addXp(minutosFeitos * 2);
      addMoedas(minutosFeitos);
    }
    setRodando(false);
    router.back();
  }

  const progresso = totalSegundos.current > 0
    ? (totalSegundos.current - segundos) / totalSegundos.current
    : 0;

  const graus = progresso * 360;

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <View className="flex-1 px-6 pt-4 pb-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Pressable onPress={encerrar} className="p-2 -ml-2">
            <Text className="text-violet-600 text-base font-semibold">← Voltar</Text>
          </Pressable>
          <Text variant="h3" className="text-violet-800">🎯 Sessão de Foco</Text>
          <View style={{ width: 70 }} />
        </View>

        <Text variant="small" color="secondary" className="text-center mb-8">
          Parou no meio? Tudo bem — ainda conta. ✨
        </Text>

        {/* Timer visual */}
        <View className="items-center mb-8">
          <View
            className="w-56 h-56 rounded-full items-center justify-center shadow-xl"
            style={{
              backgroundColor: completo ? '#10B981' : '#7C3AED',
              shadowColor: completo ? '#10B981' : '#7C3AED',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            {completo ? (
              <View className="items-center">
                <Text className="text-5xl">🎉</Text>
                <Text className="text-white text-xl font-bold mt-2">Completo!</Text>
                <Text className="text-emerald-100 text-sm">+30 XP · +15 🪙</Text>
              </View>
            ) : (
              <View className="items-center">
                <Text className="text-white text-5xl font-bold">
                  {formatarTempo(segundos)}
                </Text>
                <Text className="text-violet-200 text-sm mt-1">
                  {rodando ? 'focando...' : 'pausado'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Seletor de duração */}
        <Text variant="small" color="secondary" className="mb-3 font-semibold">Duração</Text>
        <View className="flex-row gap-2 mb-8">
          {duracoes.map((d) => (
            <Pressable
              key={d.value}
              onPress={() => selecionarDuracao(d.value)}
              className={`flex-1 py-3 rounded-2xl items-center ${duracaoMin === d.value ? 'bg-violet-600' : 'bg-white border border-slate-200'}`}
            >
              <Text className={`font-semibold text-sm ${duracaoMin === d.value ? 'text-white' : 'text-slate-600'}`}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Botão principal */}
        {!completo && (
          <Pressable
            onPress={iniciarPausar}
            className={`rounded-2xl py-4 items-center mb-4 ${rodando ? 'bg-orange-500' : 'bg-violet-600'}`}
          >
            <Text className="text-white font-bold text-base">
              {rodando ? '⏸ Pausar sessão' : '▶ Começar agora'}
            </Text>
          </Pressable>
        )}

        {(rodando || completo) && (
          <Pressable
            onPress={encerrar}
            className="rounded-2xl py-4 items-center border border-slate-200 bg-white"
          >
            <Text className="text-slate-500 font-semibold">
              {completo ? 'Voltar' : 'Encerrar e salvar'}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

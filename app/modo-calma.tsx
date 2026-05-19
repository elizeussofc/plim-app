import { Text } from '@/components/ui';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const frases = [
  'Inspire devagar...',
  'Segure...',
  'Expire devagar...',
  'Descanse...',
];

export default function ModoCalmaScreen() {
  const router = useRouter();
  const registrarEvento = useDesafiosStore((s) => s.registrarEvento);
  const addXp = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);
  const escala = useRef(new Animated.Value(1)).current;
  const opacidade = useRef(new Animated.Value(0.6)).current;
  const [faseIndex, setFaseIndex] = useState(0);
  const [ativo, setAtivo] = useState(false);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!ativo) {
      animRef.current?.stop();
      Animated.parallel([
        Animated.timing(escala, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(opacidade, { toValue: 0.6, duration: 600, useNativeDriver: true }),
      ]).start();
      return;
    }

    let fase = 0;
    const duracoes = [4000, 2000, 4000, 2000]; // inspira, segura, expira, descansa
    const escalas = [1.35, 1.35, 1, 1];
    const opacidades = [1, 1, 0.6, 0.6];

    function proximaFase() {
      setFaseIndex(fase);
      const anim = Animated.parallel([
        Animated.timing(escala, { toValue: escalas[fase], duration: duracoes[fase], useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(opacidade, { toValue: opacidades[fase], duration: duracoes[fase], useNativeDriver: true }),
      ]);
      animRef.current = anim;
      anim.start(({ finished }) => {
        if (!finished) return;
        fase = (fase + 1) % 4;
        proximaFase();
      });
    }

    proximaFase();
    return () => animRef.current?.stop();
  }, [ativo]);

  return (
    <SafeAreaView className="flex-1 bg-violet-50">
      <View className="flex-1 px-6 pt-4 pb-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <Text className="text-violet-600 text-base font-semibold">← Voltar</Text>
          </Pressable>
          <Text variant="h3" className="text-violet-800">😌 Modo Calma</Text>
          <View style={{ width: 70 }} />
        </View>

        <View className="flex-1 items-center justify-center">
          {/* Círculo de respiração */}
          <View className="items-center justify-center mb-10">
            {/* Anel externo estático */}
            <View className="absolute w-72 h-72 rounded-full border-2 border-violet-200 opacity-40" />
            {/* Círculo animado */}
            <Animated.View
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: '#7C3AED',
                transform: [{ scale: escala }],
                opacity: opacidade,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 20,
                elevation: 12,
              }}
            >
              <Text className="text-5xl">😌</Text>
            </Animated.View>
          </View>

          {/* Instrução */}
          <Text className="text-violet-800 text-xl font-semibold text-center mb-2">
            {ativo ? frases[faseIndex] : 'Pronto para respirar?'}
          </Text>
          <Text variant="small" color="secondary" className="text-center mb-10 leading-5">
            {ativo
              ? 'Siga o ritmo do círculo.\nResponda devagar, sem pressa.'
              : '4 segundos inspira · 2 segura\n4 segundos expira · 2 descansa'}
          </Text>

          {/* Botão */}
          <Pressable
            onPress={() => {
              const novoAtivo = !ativo;
              setAtivo(novoAtivo);
              if (novoAtivo) registrarEvento('calma_3x')(addXp, addMoedas);
            }}
            className={`px-10 py-4 rounded-full ${ativo ? 'bg-orange-500' : 'bg-violet-600'}`}
            style={{ shadowColor: ativo ? '#F97316' : '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
          >
            <Text className="text-white font-bold text-base">
              {ativo ? '⏸ Pausar' : '▶ Começar'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

import { Botao, Cabecalho } from '@/components/plim';
import { Text } from '@/components/Texto';
import { C, F } from '@/lib/theme';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { useUserStore } from '@/stores/userStore';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FASES = [
  { frase: 'Inspire devagar', duracao: 4000, escala: 1.28 },
  { frase: 'Segure',          duracao: 2000, escala: 1.28 },
  { frase: 'Solte o ar',      duracao: 4000, escala: 1 },
  { frase: 'Descanse',        duracao: 2000, escala: 1 },
];
const CICLO_MS = FASES.reduce((s, f) => s + f.duracao, 0);
/** O desafio "Calma 3 vezes" conta depois de 3 ciclos seguidos (36 s), não ao apertar o botão. */
const CICLOS_PARA_CONTAR = 3;

export default function ModoCalmaScreen() {
  const registrarEvento = useDesafiosStore((s) => s.registrarEvento);
  const addXp = useUserStore((s) => s.addXp);
  const addMoedas = useUserStore((s) => s.addMoedas);
  const escala = useRef(new Animated.Value(1)).current;
  const [fase, setFase] = useState(0);
  const [ciclos, setCiclos] = useState(0);
  const [ativo, setAtivo] = useState(false);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const contou = useRef(false);

  useEffect(() => {
    if (!ativo) {
      animRef.current?.stop();
      Animated.timing(escala, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
      return;
    }
    let atual = 0;
    let feitos = 0;
    function proxima() {
      setFase(atual);
      const anim = Animated.timing(escala, { toValue: FASES[atual].escala, duration: FASES[atual].duracao, useNativeDriver: true, easing: Easing.inOut(Easing.ease) });
      animRef.current = anim;
      anim.start(({ finished }) => {
        if (!finished) return;
        atual = (atual + 1) % FASES.length;
        if (atual === 0) {
          feitos += 1;
          setCiclos(feitos);
          if (feitos >= CICLOS_PARA_CONTAR && !contou.current) {
            contou.current = true;
            registrarEvento('calma_3x')(addXp, addMoedas);
          }
        }
        proxima();
      });
    }
    proxima();
    return () => animRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  function alternar() {
    if (ativo) setCiclos(0);
    setAtivo((v) => !v);
  }

  const segundos = Math.round((ciclos * CICLO_MS) / 1000);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.successSoft }}>
      <View style={{ flex: 1, maxWidth: 480, width: '100%', alignSelf: 'center', padding: 20 }}>
        <Cabecalho titulo="Modo Calma" icone="lotus" />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* Círculo de respiração: cresce ao inspirar, encolhe ao soltar */}
          <View style={{ width: 300, height: 300, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Animated.View style={{ position: 'absolute', width: 224, height: 224, borderRadius: 112, backgroundColor: '#BDEBD6', transform: [{ scale: escala }] }} />
            <Animated.View style={{ position: 'absolute', width: 176, height: 176, borderRadius: 88, backgroundColor: C.surface, transform: [{ scale: escala }] }} />
            <Image source={require('../assets/cenas/calma.webp')} style={{ width: 150, height: 180 }} resizeMode="contain" accessible={false} />
          </View>

          <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.displayX, fontSize: 28, color: C.text, textAlign: 'center' }}>
            {ativo ? FASES[fase].frase : 'Vamos respirar juntos?'}
          </Text>
          <Text style={{ fontSize: 15, color: C.textSub, textAlign: 'center', marginTop: 8, lineHeight: 22, minHeight: 44 }}>
            {ativo
              ? (ciclos > 0 ? `${ciclos} ${ciclos === 1 ? 'respiração' : 'respirações'} · ${segundos} segundos de calma` : 'Acompanhe o círculo. Sem pressa.')
              : 'Inspire em 4 segundos, segure 2,\nsolte em 4, descanse 2.'}
          </Text>
        </View>

        <Botao rotulo={ativo ? 'Parar' : 'Começar'} cor={ativo ? 'claro' : 'verde'} onPress={alternar} />
      </View>
    </SafeAreaView>
  );
}

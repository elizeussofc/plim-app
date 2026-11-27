import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import AvatarPersonagem from '@/components/AvatarPersonagem';
import { Text } from '@/components/Texto';
import { C, R } from '@/lib/theme';
import { useFalaStore, type FalaAtual } from '@/stores/falaStore';
import { useUserStore } from '@/stores/userStore';
import { usePathname } from 'expo-router';

/** Quanto tempo o balão fica na tela, e até quando uma fala ainda vale ser mostrada. */
const DURACAO_MS = 7000;
const VALIDADE_MS = 90_000;

/** Devolve a fala a mostrar agora e cuida de ela sumir sozinha. */
export function useFalaVisivel(): FalaAtual | null {
  const fala = useFalaStore((s) => s.fala);
  const calar = useFalaStore((s) => s.calar);
  const valida = fala && Date.now() - fala.criadaEm < VALIDADE_MS ? fala : null;

  useEffect(() => {
    if (!valida) return;
    const id = valida.id;
    const t = setTimeout(() => { if (useFalaStore.getState().fala?.id === id) calar(); }, DURACAO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valida?.id]);

  return valida;
}

type Ponta = 'cima-direita' | 'baixo-esquerda' | 'baixo-centro' | 'esquerda';

/** Balão de fala do avatar. `ponta` diz para onde o biquinho aponta (onde está o avatar). */
export function Balao({ fala, ponta, estilo }: { fala: FalaAtual; ponta: Ponta; estilo?: StyleProp<ViewStyle> }) {
  const calar = useFalaStore((s) => s.calar);
  const entrada = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entrada.setValue(0);
    Animated.timing(entrada, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fala.id]);

  const bico: ViewStyle = { position: 'absolute', width: 16, height: 16, backgroundColor: C.surface, borderColor: C.borderPrimary, transform: [{ rotate: '45deg' }] };
  const bicos: Record<Ponta, ViewStyle> = {
    'cima-direita':   { ...bico, top: -9, right: 22, borderLeftWidth: 2, borderTopWidth: 2 },
    'baixo-esquerda': { ...bico, bottom: -10, left: 22, borderRightWidth: 2, borderBottomWidth: 4 },
    'baixo-centro':   { ...bico, bottom: -10, alignSelf: 'center', borderRightWidth: 2, borderBottomWidth: 4 },
    esquerda:         { ...bico, left: -9, top: 14, borderLeftWidth: 2, borderBottomWidth: 2 },
  };

  return (
    <Animated.View style={[{ opacity: entrada, transform: [{ scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }, estilo]}>
      <Pressable
        onPress={calar}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Seu avatar diz: ${fala.texto}`}
        accessibilityHint="Toque para fechar"
        style={{ backgroundColor: C.surface, borderRadius: R.md, borderWidth: 2, borderBottomWidth: 4, borderColor: C.borderPrimary, paddingHorizontal: 14, paddingVertical: 10 }}
      >
        <View style={bicos[ponta]} />
        <Text style={{ fontSize: 15, color: C.text, lineHeight: 21 }}>{fala.texto}</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Nas abas em que o avatar não aparece (Rotina, Plim, Grupo), ele surge pequeno acima da
 * barra de baixo para comentar o que a pessoa acabou de fazer.
 */
export function FalaFlutuante({ fundo }: { fundo: number }) {
  const caminho = usePathname();
  const fala = useFalaVisivel();
  const config = useUserStore((s) => s.profile.avatar_config);
  const temAvatarNaTela = caminho === '/' || caminho.endsWith('/perfil');
  if (!fala || temAvatarNaTela) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 82, bottom: fundo, zIndex: 15, flexDirection: 'row', alignItems: 'flex-end', gap: 12, maxWidth: 400 }}>
      <View style={{ borderRadius: 30, borderWidth: 3, borderBottomWidth: 5, borderColor: C.primary }}>
        <AvatarPersonagem config={config} expressao={fala.humor} size={48} />
      </View>
      <Balao fala={fala} ponta="esquerda" estilo={{ flex: 1, marginBottom: 6 }} />
    </View>
  );
}

/** Abas (quem cuida é a FalaFlutuante), telas de entrada e telas de relógio em tela cheia, onde o balão atrapalharia. */
const SEM_BALAO = ['/', '/rotina', '/foco', '/comunidade', '/perfil', '/login', '/cadastro', '/onboarding', '/gym-treino', '/missao', '/sessao-foco', '/modo-calma', '/ia-tdah'];

/**
 * Nas telas internas (Gym, Finanças, Sono, Estudos, Casa, Guarda-roupa, Resumo...) o avatar
 * aparece pequeno no rodapé. Essas telas rolam, então a fala não fica em cima de botão fixo.
 * Antes ele falava nessas telas e ninguém via: o balão só existia dentro das abas.
 */
export function FalaDasTelasInternas() {
  const caminho = usePathname();
  const fala = useFalaVisivel();
  const config = useUserStore((s) => s.profile.avatar_config);
  if (!fala || SEM_BALAO.includes(caminho)) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 18, zIndex: 15, alignItems: 'center' }}>
      <View pointerEvents="box-none" style={{ width: '100%', maxWidth: 480, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ borderRadius: 30, borderWidth: 3, borderBottomWidth: 5, borderColor: C.primary, backgroundColor: C.surface }}>
          <AvatarPersonagem config={config} expressao={fala.humor} size={48} />
        </View>
        <Balao fala={fala} ponta="esquerda" estilo={{ flex: 1, marginBottom: 6 }} />
      </View>
    </View>
  );
}

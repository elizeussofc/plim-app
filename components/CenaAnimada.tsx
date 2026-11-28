import { useUserStore } from '@/stores/userStore';
import { useState } from 'react';
import { Image, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

// As cenas que ganharam vida. "escala" é o tamanho do boneco dentro do arquivo animado em relação
// ao da ilustração parada. Desde 28/11/2026 as duas saem do mesmo enquadramento (os bonecos novos,
// renderizados por tools/avatar/v2/07_cenas.py), então a escala é 1: a animada troca de lugar com
// a parada sem mudar de tamanho.
const CENAS = {
  ola: { parada: require('../assets/cenas/ola.webp'), viva: require('../assets/cenas/ola-animado.webp'), escala: 1 },
  vitoria: { parada: require('../assets/cenas/vitoria.webp'), viva: require('../assets/cenas/vitoria-animado.webp'), escala: 1 },
} as const;

export type Cena = keyof typeof CENAS;

function sistemaPedeMenosMovimento(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Ilustração do Plim que se mexe em laço (os bonecos acenando, a comemoração).
 * Fica parada com "Menos movimento", no modo calmo, quando o aparelho pede menos movimento
 * e fora da web. A parada aparece primeiro; a animada entra por cima quando termina de carregar.
 */
export default function CenaAnimada({ cena, largura, altura, estilo }: { cena: Cena; largura: number; altura: number; estilo?: StyleProp<ViewStyle> }) {
  const prefs = useUserStore((s) => s.profile.preferencias);
  const [pronta, setPronta] = useState(false);
  const c = CENAS[cena];
  const viva = Platform.OS === 'web' && !prefs?.reduzir_animacoes && !prefs?.modo_baixo_estimulo && !sistemaPedeMenosMovimento();
  const l = largura / c.escala;
  const a = altura / c.escala;

  // A animada passa um pouco da caixa (o pulo, o confete). Uma folga embaixo evita que encoste no título.
  const folga = viva ? Math.round((a - altura) / 4) : 0;

  return (
    <View style={[{ width: largura, height: altura, marginBottom: folga }, estilo]} accessible={false}>
      {!(viva && pronta) && <Image source={c.parada} style={{ width: largura, height: altura }} resizeMode="contain" accessible={false} />}
      {viva && (
        <Image
          source={c.viva}
          onLoad={() => setPronta(true)}
          style={{ position: 'absolute', width: l, height: a, left: (largura - l) / 2, top: (altura - a) / 2, opacity: pronta ? 1 : 0 }}
          resizeMode="contain"
          accessible={false}
        />
      )}
    </View>
  );
}

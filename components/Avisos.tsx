import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Texto';
import { ouvirAvisos, type Aviso } from '@/lib/avisar';
import { C, F, R } from '@/lib/theme';

const DURACAO = 4200;

/** Faixa de aviso no topo da tela. Um só, montado no layout raiz. Some sozinha ou ao toque. */
export default function Avisos() {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const topo = useSafeAreaInsets().top;

  useEffect(() => {
    ouvirAvisos(setAviso);
    return () => ouvirAvisos(null);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), DURACAO);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!aviso) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: topo + 10, left: 0, right: 0, alignItems: 'center', zIndex: 1000, paddingHorizontal: 16 }}>
      <Pressable
        onPress={() => setAviso(null)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${aviso.titulo}. ${aviso.texto ?? ''} Toque para fechar.`}
        style={{
          width: '100%',
          maxWidth: 448,
          backgroundColor: C.text,
          borderRadius: R.md,
          borderBottomWidth: 5,
          borderColor: '#170E2E',
          paddingHorizontal: 18,
          paddingVertical: 13,
        }}
      >
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.onPrimary }}>{aviso.titulo}</Text>
        {!!aviso.texto && <Text style={{ fontSize: 14, color: '#E4DCF5', marginTop: 2, lineHeight: 20 }}>{aviso.texto}</Text>}
      </Pressable>
    </View>
  );
}

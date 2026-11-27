import AvatarPersonagem from '@/components/AvatarPersonagem';
import { Text } from '@/components/Texto';
import { C, F } from '@/lib/theme';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  avatar: unknown;
  nome: string;
  /** 'novo' = anel colorido; 'visto' = anel apagado; 'nenhum' = sem story. */
  anel: 'novo' | 'visto' | 'nenhum';
  tamanho?: number;
  /** Mostra o "+" de publicar (a bolinha da própria pessoa). */
  mais?: boolean;
  aoTocar?: () => void;
  aoTocarMais?: () => void;
  rotulo?: string;
}

/** A bolinha redonda de story: o boneco da pessoa dentro de um anel. */
export default function Bolinha({ avatar, nome, anel, tamanho = 66, mais, aoTocar, aoTocarMais, rotulo }: Props) {
  const borda = 3;
  const folga = 3;
  const dentro = tamanho - (borda + folga) * 2;
  const miolo = (
<AvatarPersonagem config={avatar} size={dentro} />
  );
  return (
    <View style={{ width: tamanho + 10, alignItems: 'center' }}>
      <Pressable onPress={aoTocar} disabled={!aoTocar} accessibilityRole="button" accessibilityLabel={rotulo ?? nome}>
        <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
          {anel !== 'nenhum' && (
            <Svg width={tamanho} height={tamanho} style={{ position: 'absolute' }}>
              <Defs>
                <LinearGradient id="anel-story" x1="0" y1="1" x2="1" y2="0">
                  <Stop offset="0" stopColor="#F59E0B" />
                  <Stop offset="0.4" stopColor="#EA580C" />
                  <Stop offset="0.7" stopColor="#DB4F93" />
                  <Stop offset="1" stopColor="#7C3AED" />
                </LinearGradient>
              </Defs>
              <Circle cx={tamanho / 2} cy={tamanho / 2} r={(tamanho - borda) / 2} strokeWidth={borda} fill="none" stroke={anel === 'novo' ? 'url(#anel-story)' : C.borderBright} />
            </Svg>
          )}
          {miolo}
        </View>
      </Pressable>
      {mais && (
        <Pressable
          onPress={aoTocarMais}
          accessibilityRole="button"
          accessibilityLabel="Publicar um story"
          hitSlop={10}
          style={{ position: 'absolute', right: 0, top: tamanho - 24, width: 26, height: 26, borderRadius: 13, backgroundColor: C.primary, borderWidth: 3, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: C.onPrimary, fontFamily: F.displayX, fontSize: 15, lineHeight: 17 }}>+</Text>
        </Pressable>
      )}
      <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 12, color: anel === 'visto' ? C.textMuted : C.text, marginTop: 5, maxWidth: tamanho + 10 }}>{nome}</Text>
    </View>
  );
}

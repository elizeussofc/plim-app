import { ActivityIndicator, Pressable, PressableProps, View, type ViewStyle } from 'react-native';
import { Text } from '@/components/Texto';
import { C, F } from '@/lib/theme';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'energy' | 'calm';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  label: string;
  iconLeft?: React.ReactNode;
  className?: string;
}

const CORES = {
  primary:   { fundo: C.primary,  baixo: C.primaryDim,    texto: C.onPrimary },
  secondary: { fundo: C.glass,    baixo: C.borderPrimary, texto: C.primaryLight },
  ghost:     { fundo: C.surface,  baixo: C.border,        texto: C.textSub },
  energy:    { fundo: C.accent,   baixo: C.accentDim,     texto: C.onPrimary },
  calm:      { fundo: C.sky,      baixo: '#1E5FB8',       texto: C.onPrimary },
} as const;

const TAMANHOS = {
  sm: { minHeight: 44, paddingHorizontal: 16, borderRadius: 14, fontSize: 14 },
  md: { minHeight: 52, paddingHorizontal: 22, borderRadius: 18, fontSize: 16 },
  lg: { minHeight: 58, paddingHorizontal: 28, borderRadius: 20, fontSize: 17 },
} as const;

/**
 * Botão de apertar: afunda 3 px quando pressionado, como um brinquedo.
 * As classes (margem, largura) vão na moldura de fora; o botão em si usa só estilo,
 * porque classe e estilo-função juntos no Pressable faziam o fundo sumir.
 */
export function Button({ variant = 'primary', size = 'md', loading, label, iconLeft, className = '', disabled, ...props }: ButtonProps) {
  const cor = CORES[variant];
  const t = TAMANHOS[size];
  const parado = disabled || loading;
  return (
    <View className={className}>
      <Pressable
        disabled={parado}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!parado, busy: !!loading }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: t.minHeight,
          paddingHorizontal: t.paddingHorizontal,
          borderRadius: t.borderRadius,
          backgroundColor: cor.fundo,
          borderColor: cor.baixo,
          borderWidth: variant === 'ghost' || variant === 'secondary' ? 2 : 0,
          borderBottomWidth: pressed ? 2 : 5,
          marginTop: pressed ? 3 : 0,
          opacity: parado ? 0.5 : 1,
        } as ViewStyle)}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color={cor.texto} />
        ) : (
          <>
            {iconLeft && <View>{iconLeft}</View>}
            <Text style={{ fontFamily: F.display, fontSize: t.fontSize, color: cor.texto }}>{label}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

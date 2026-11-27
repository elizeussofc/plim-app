import { View } from 'react-native';
import { Text } from '@/components/Texto';
import { C, F } from '@/lib/theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'energy' | 'calm' | 'muted';
}

const variants = {
  primary: { fundo: C.glass,       texto: C.primaryLight },
  success: { fundo: C.successSoft, texto: C.successDim },
  energy:  { fundo: C.accentSoft,  texto: C.accentDim },
  calm:    { fundo: C.skySoft,     texto: C.sky },
  muted:   { fundo: C.surfaceHigh, texto: C.textSub },
} as const;

export function Badge({ label, variant = 'primary' }: BadgeProps) {
  const { fundo, texto } = variants[variant];
  return (
    <View style={{ backgroundColor: fundo, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ color: texto, fontSize: 12, fontFamily: F.bold }}>{label}</Text>
    </View>
  );
}

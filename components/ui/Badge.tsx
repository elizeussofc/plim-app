import { View } from 'react-native';
import { Text } from './Text';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'energy' | 'calm' | 'muted';
}

const variants = {
  primary: { bg: 'bg-violet-100', text: 'text-violet-700' },
  success: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  energy:  { bg: 'bg-orange-100', text: 'text-orange-700' },
  calm:    { bg: 'bg-sky-100', text: 'text-sky-700' },
  muted:   { bg: 'bg-slate-100', text: 'text-slate-500' },
};

export function Badge({ label, variant = 'primary' }: BadgeProps) {
  const { bg, text } = variants[variant];
  return (
    <View className={`${bg} px-2 py-0.5 rounded-full self-start`}>
      <Text className={`${text} text-xs font-semibold`}>{label}</Text>
    </View>
  );
}

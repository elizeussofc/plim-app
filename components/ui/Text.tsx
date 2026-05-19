import { Text as RNText, TextProps } from 'react-native';

interface PlimTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
  color?: 'primary' | 'secondary' | 'muted' | 'inverse' | 'energy' | 'success';
}

const variantClasses: Record<NonNullable<PlimTextProps['variant']>, string> = {
  h1:      'text-3xl font-bold',
  h2:      'text-2xl font-bold',
  h3:      'text-xl font-semibold',
  body:    'text-base font-normal',
  small:   'text-sm font-normal',
  caption: 'text-xs font-normal',
};

const colorClasses: Record<NonNullable<PlimTextProps['color']>, string> = {
  primary:   'text-slate-800',
  secondary: 'text-slate-500',
  muted:     'text-slate-400',
  inverse:   'text-white',
  energy:    'text-orange-500',
  success:   'text-emerald-500',
};

export function Text({ variant = 'body', color = 'primary', className = '', ...props }: PlimTextProps) {
  return (
    <RNText
      className={`${variantClasses[variant]} ${colorClasses[color]} ${className}`}
      {...props}
    />
  );
}

import { View, ViewProps } from 'react-native';
import { C, peca } from '@/lib/theme';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'flat' | 'primary';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyle = {
  default:  peca(C.border, C.surface),
  elevated: peca(C.borderBright, C.surface),
  flat:     { backgroundColor: C.surfaceHigh, borderRadius: 24 },
  primary:  peca(C.primaryDim, C.primary),
} as const;

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

/** Peça de massinha: fundo branco, borda creme e a borda de baixo mais grossa. */
export function Card({ variant = 'default', padding = 'md', className = '', style, ...props }: CardProps) {
  return (
    <View
      className={`${paddingClasses[padding]} ${className}`}
      style={[variantStyle[variant], style]}
      {...props}
    />
  );
}

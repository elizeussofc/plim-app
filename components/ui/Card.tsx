import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'flat' | 'primary';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  default:  'bg-white rounded-3xl shadow-sm border border-slate-100',
  elevated: 'bg-white rounded-3xl shadow-md',
  flat:     'bg-slate-50 rounded-3xl',
  primary:  'bg-violet-600 rounded-3xl shadow-md',
};

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

export function Card({ variant = 'default', padding = 'md', className = '', ...props }: CardProps) {
  return (
    <View
      className={`${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...props}
    />
  );
}

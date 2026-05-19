import { ActivityIndicator, Pressable, PressableProps, View } from 'react-native';
import { Text } from './Text';

interface ButtonProps extends PressableProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'energy' | 'calm';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  label: string;
  iconLeft?: React.ReactNode;
}

const variantClasses = {
  primary:   'bg-violet-600 active:bg-violet-700',
  secondary: 'bg-violet-100 active:bg-violet-200',
  ghost:     'bg-transparent active:bg-slate-100',
  energy:    'bg-orange-500 active:bg-orange-600',
  calm:      'bg-sky-500 active:bg-sky-600',
};

const labelVariant = {
  primary:   'inverse' as const,
  secondary: 'primary' as const,
  ghost:     'primary' as const,
  energy:    'inverse' as const,
  calm:      'inverse' as const,
};

const sizeClasses = {
  sm: 'px-4 py-2 rounded-2xl',
  md: 'px-6 py-3 rounded-2xl',
  lg: 'px-8 py-4 rounded-3xl',
};

const textSize = {
  sm: 'small' as const,
  md: 'body' as const,
  lg: 'body' as const,
};

export function Button({ variant = 'primary', size = 'md', loading, label, iconLeft, className = '', disabled, ...props }: ButtonProps) {
  return (
    <Pressable
      className={`flex-row items-center justify-center gap-2 ${variantClasses[variant]} ${sizeClasses[size]} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'secondary' || variant === 'ghost' ? '#7C3AED' : '#fff'} />
      ) : (
        <>
          {iconLeft && <View>{iconLeft}</View>}
          <Text variant={textSize[size]} color={labelVariant[variant]} className="font-semibold">{label}</Text>
        </>
      )}
    </Pressable>
  );
}

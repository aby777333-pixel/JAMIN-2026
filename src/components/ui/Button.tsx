import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';

import { Text } from './Text';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

const BASE = 'flex-row items-center justify-center rounded-2xl px-5 h-13 min-h-[52px]';

const VARIANT: Record<Variant, { box: string; label: string; spinner: string }> = {
  primary: { box: 'bg-red active:bg-red-deep', label: 'text-white', spinner: '#FFFFFF' },
  secondary: { box: 'bg-gold active:bg-gold-deep', label: 'text-ink', spinner: '#1A1A1A' },
  outline: { box: 'border border-line bg-surface active:bg-paper', label: 'text-ink', spinner: '#1A1A1A' },
  ghost: { box: 'bg-transparent active:bg-paper', label: 'text-ink', spinner: '#1A1A1A' },
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  className?: string;
  left?: React.ReactNode;
}

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  className,
  left,
  ...rest
}: ButtonProps) {
  const v = VARIANT[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={cn(BASE, v.box, isDisabled && 'opacity-50', className)}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <View className="flex-row items-center gap-2">
          {left}
          <Text className={cn('font-semibold text-[15px]', v.label)}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

import { forwardRef } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { Text } from './Text';
import { cn } from '@/lib/cn';
import { color } from '@/theme/tokens';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, className, ...rest },
  ref,
) {
  return (
    <View className="gap-1.5">
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={color.muted}
        className={cn(
          'h-13 min-h-[52px] rounded-2xl border bg-surface px-4 text-[16px] text-ink font-sans',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      />
      {error ? (
        <Text variant="caption" className="text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

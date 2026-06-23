import { Pressable } from 'react-native';

import { Text } from './Text';
import { cn } from '@/lib/cn';

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'rounded-full border px-3.5 py-2',
        active ? 'border-ink bg-ink' : 'border-line bg-surface',
      )}>
      <Text className={cn('text-[13px] font-medium', active ? 'text-white' : 'text-ink')}>
        {label}
      </Text>
    </Pressable>
  );
}

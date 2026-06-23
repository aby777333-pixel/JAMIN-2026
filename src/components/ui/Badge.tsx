import { View } from 'react-native';

import { Text } from './Text';
import { cn } from '@/lib/cn';

const TONE = {
  available: 'bg-success/15 text-success',
  reserved: 'bg-warn/15 text-warn',
  sold: 'bg-danger/15 text-danger',
  neutral: 'bg-ink/10 text-ink',
} as const;

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: keyof typeof TONE;
}) {
  const [bg, text] = TONE[tone].split(' ');
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', bg)}>
      <Text className={cn('text-[11px] font-semibold uppercase tracking-[0.5px]', text)}>
        {label}
      </Text>
    </View>
  );
}

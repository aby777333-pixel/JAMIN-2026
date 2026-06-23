import { View } from 'react-native';

import { Text } from './Text';
import { cn } from '@/lib/cn';

const TONES: Record<string, string> = {
  new: 'bg-ink/10 text-ink',
  contacted: 'bg-warn/15 text-warn',
  qualified: 'bg-gold/20 text-gold-deep',
  visit: 'bg-ink/10 text-ink',
  won: 'bg-success/15 text-success',
  lost: 'bg-danger/15 text-danger',
  // withdrawals
  requested: 'bg-warn/15 text-warn',
  approved: 'bg-gold/20 text-gold-deep',
  paid: 'bg-success/15 text-success',
  rejected: 'bg-danger/15 text-danger',
  // follow-ups
  pending: 'bg-warn/15 text-warn',
  done: 'bg-success/15 text-success',
};

export function StatusPill({ status }: { status: string }) {
  const tone = TONES[status] ?? 'bg-ink/10 text-ink';
  const [bg, text] = tone.split(' ');
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', bg)}>
      <Text className={cn('text-[11px] font-semibold uppercase tracking-[0.5px]', text)}>
        {status}
      </Text>
    </View>
  );
}

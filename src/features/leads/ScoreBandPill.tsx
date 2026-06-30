import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

/** Hot / warm / cold lead-score badge. Reads the DB-synced score_band. */
const TONE: Record<string, string> = {
  hot: 'bg-success/15 text-success',
  warm: 'bg-gold/20 text-gold-deep',
  cold: 'bg-ink/10 text-muted',
};

export function ScoreBandPill({ band, score }: { band?: string | null; score?: number | null }) {
  if (!band) return null;
  const tone = TONE[band] ?? 'bg-ink/10 text-muted';
  const [bg, text] = tone.split(' ');
  return (
    <View className={cn('self-start flex-row items-center gap-1 rounded-full px-2 py-0.5', bg)}>
      <Text className={cn('text-[10px] font-bold uppercase tracking-[0.5px]', text)}>{band}</Text>
      {score != null ? <Text className={cn('font-mono text-[10px]', text)}>{score}</Text> : null}
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';
import { nextAuspiciousDates } from './muhurat';

/**
 * Lists the next few auspicious days (favourable weekdays + festivals) as gentle
 * guidance for completing a booking / planning a visit. Positive-only, decorative.
 */
export function AuspiciousDatesCard({
  title = 'Auspicious days ahead',
  subtitle = 'Favourable days to visit, book or complete your purchase.',
  count = 6,
}: {
  title?: string;
  subtitle?: string;
  count?: number;
}) {
  const days = useMemo(() => nextAuspiciousDates(new Date(), count), [count]);

  return (
    <Card className="gap-2 border-gold/40 bg-[#FDF3D8]">
      <View className="flex-row items-center gap-2">
        <Ionicons name="calendar" size={16} color={color.goldDeep} />
        <Text variant="title" className="flex-1 text-[15px]">
          {title}
        </Text>
      </View>
      <Text variant="caption">{subtitle}</Text>
      <View className="flex-row flex-wrap gap-2 pt-1">
        {days.map((d) => (
          <View
            key={d.label}
            className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1 ${
              d.festival ? 'border-red/40 bg-red/10' : 'border-gold/40 bg-surface/70'
            }`}>
            {d.festival ? <Ionicons name="sparkles" size={11} color={color.red} /> : null}
            <Text
              className={`text-[12px] font-semibold ${d.festival ? 'text-red' : 'text-ink'}`}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="caption" className="text-muted">
        Traditional guidance — please confirm the exact muhurat with your panchang or priest.
      </Text>
    </Card>
  );
}

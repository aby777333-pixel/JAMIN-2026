import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { usePriceHistory } from '../hooks';
import { money } from '@/lib/money';
import { color } from '@/theme/tokens';

/** Price-change history for a listing. Hidden until there's at least one change. */
export function PriceHistoryPanel({ propertyId }: { propertyId: string }) {
  const { data: history = [] } = usePriceHistory(propertyId);
  const changes = history.filter((h) => h.old_price != null);
  if (changes.length === 0) return null;

  return (
    <Card className="gap-2">
      <Text variant="title" className="text-[14px]">
        Price history
      </Text>
      {changes.map((h) => {
        const dropped = money(h.new_price).lessThan(money(h.old_price ?? 0));
        return (
          <View key={h.id} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons
                name={dropped ? 'trending-down' : 'trending-up'}
                size={15}
                color={dropped ? color.success : color.red}
              />
              <Text variant="caption">
                {new Date(h.changed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text variant="caption" className="text-muted line-through">
                {money(h.old_price ?? 0).toString()}
              </Text>
              <MoneyText value={h.new_price} className="text-[13px]" />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

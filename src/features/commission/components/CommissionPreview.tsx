import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { directCommission, teamOverridePerAncestor, type PropertyCtx } from '../engine';
import { useActiveRules } from '../hooks';
import { formatINR } from '@/lib/money';
import { color } from '@/theme/tokens';

/** Partner-only earning preview for a property (mirrors the settlement engine). */
export function CommissionPreview({ ctx }: { ctx: PropertyCtx }) {
  const { data: rules = [] } = useActiveRules();
  const direct = directCommission(ctx, rules);
  const override = teamOverridePerAncestor(ctx, rules);
  if (direct.lessThanOrEqualTo(0) && override.lessThanOrEqualTo(0)) return null;

  return (
    <Card className="gap-1 border-gold/40 bg-gold/10">
      <View className="flex-row items-center gap-2">
        <Ionicons name="cash" size={16} color={color.goldDeep} />
        <Text variant="label" className="text-gold-deep">
          Your commission on this sale
        </Text>
      </View>
      <MoneyText value={direct.toString()} className="text-[24px]" />
      {override.greaterThan(0) ? (
        <Text variant="caption">
          + {formatINR(override.toString())} team override to each upline
        </Text>
      ) : null}
    </Card>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { readFacing, vastuScore } from '@/features/astro/vastu';
import { formatINR } from '@/lib/money';
import { color } from '@/theme/tokens';
import { ConsultSheet } from './ConsultSheet';
import { toGold, useGoldRate } from './gold';
import { shagunAmounts } from './shagun';

/**
 * Investment & Vastu snapshot for a property — the Indian-mindset lens:
 * gold-equivalent value, a positive Vastu compliance score, auspicious "shagun"
 * token amounts, and a one-tap request to talk to an expert.
 */
export function InvestValueCard({
  property,
}: {
  property: { id: string; price: number; attrs?: Record<string, unknown> | null };
}) {
  const { data: goldRate = 0 } = useGoldRate();
  const [consult, setConsult] = useState(false);

  const gold = useMemo(() => toGold(property.price, goldRate), [property.price, goldRate]);
  const facing = readFacing(property.attrs);
  const score = vastuScore(facing, property.attrs);
  const tokens = useMemo(() => shagunAmounts(property.price), [property.price]);

  return (
    <>
      <Card className="gap-3 border-gold/50 bg-[#FDF3D8]">
        <View className="flex-row items-center gap-2">
          <Ionicons name="trending-up" size={18} color={color.goldDeep} />
          <Text variant="title" className="flex-1">
            Investment &amp; Vastu
          </Text>
        </View>

        <View className="flex-row items-start gap-2">
          <Text className="text-[15px]">🪙</Text>
          <View className="flex-1">
            <Text variant="caption">Gold-equivalent value</Text>
            <Text className="text-[14px] font-semibold text-ink">
              ≈ {Math.round(gold.sovereigns).toLocaleString('en-IN')} sovereigns
              <Text className="font-normal text-muted"> ({Math.round(gold.grams).toLocaleString('en-IN')} g of gold)</Text>
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Ionicons name="compass" size={16} color={color.goldDeep} />
          <View className="flex-1">
            <Text variant="caption">Vastu compliance{facing ? ` · ${facing} facing` : ''}</Text>
            <Text className="text-[14px] font-semibold text-ink">{score} / 100</Text>
          </View>
          <View className="h-2 w-24 overflow-hidden rounded-full bg-ink/10">
            <View className="h-full rounded-full bg-success" style={{ width: `${score}%` }} />
          </View>
        </View>

        <View className="gap-1">
          <Text variant="caption">Auspicious token (shagun) amounts</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {tokens.map((a) => (
              <View key={a} className="rounded-full border border-gold/40 bg-surface/70 px-2.5 py-1">
                <Text className="text-[12px] font-semibold text-gold-deep">{formatINR(a)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Button
          title="Talk to a Vastu / investment expert"
          variant="outline"
          left={<Ionicons name="chatbubble-ellipses" size={16} color={color.ink} />}
          onPress={() => setConsult(true)}
        />

        <Text variant="caption" className="text-muted">
          Gold value is indicative (rate set by JAMIN); traditions shared for positivity, not as advice.
        </Text>
      </Card>

      <ConsultSheet visible={consult} onClose={() => setConsult(false)} propertyId={property.id} />
    </>
  );
}

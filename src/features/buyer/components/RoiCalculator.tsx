import { useState } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { money, roiPercent, round2 } from '@/lib/money';

/** ROI Calculator (§5.04) — projected appreciation, exact decimal math. */
export function RoiCalculator({ price }: { price: number }) {
  const [appr, setAppr] = useState('8');
  const [years, setYears] = useState('5');

  const yrs = Math.max(0, Math.round(toNum(years)));
  const future = round2(money(price).times(money(1).plus(money(toNum(appr)).dividedBy(100)).pow(yrs)));
  const roi = roiPercent(price, future);

  return (
    <Card className="gap-3">
      <Text variant="title">ROI Calculator</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Appreciation %/yr" value={appr} onChangeText={setAppr} keyboardType="numeric" />
        </View>
        <View className="flex-1">
          <Input label="Hold (years)" value={years} onChangeText={setYears} keyboardType="numeric" />
        </View>
      </View>

      <View className="flex-row justify-between">
        <View className="rounded-xl bg-paper p-3 flex-1 mr-2">
          <Text variant="label">Projected value</Text>
          <MoneyText value={future} className="text-[18px]" />
        </View>
        <View className="rounded-xl bg-success/10 p-3 flex-1">
          <Text variant="label">Total ROI</Text>
          <Text className="font-mono-bold text-[18px] text-success">{roi.toString()}%</Text>
        </View>
      </View>
    </Card>
  );
}

function toNum(s: string) {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

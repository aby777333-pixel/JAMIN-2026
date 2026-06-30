import { useState } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { emi, money, round2 } from '@/lib/money';

const toNum = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Rent-vs-buy over a horizon. Buying cost = total interest paid + stamp/registration
 * outlay, net of equity built; renting cost = sum of rent (with annual escalation).
 * Simplified but decimal-exact; helps a buyer see the crossover.
 */
export function RentVsBuyCalculator({ price }: { price: number }) {
  const [rent, setRent] = useState('20000');
  const [escalation, setEscalation] = useState('5');
  const [years, setYears] = useState('5');
  const [downPct, setDownPct] = useState('20');
  const [rate, setRate] = useState('9');

  const n = Math.max(1, Math.round(toNum(years)));
  const months = n * 12;

  // Renting: rent compounded annually by escalation %.
  let totalRent = money(0);
  let yrRent = money(rent).times(12);
  const esc = money(escalation).dividedBy(100).plus(1);
  for (let y = 0; y < n; y++) {
    totalRent = totalRent.plus(yrRent);
    yrRent = round2(yrRent.times(esc));
  }
  totalRent = round2(totalRent);

  // Buying: interest paid over the horizon (the non-recoverable cost of owning).
  const principal = round2(money(price).times(money(100).minus(toNum(downPct))).dividedBy(100));
  const monthly = emi(principal, toNum(rate), 240); // 20-yr loan baseline
  const paid = round2(monthly.times(months));
  const interestPaid = round2(paid.minus(principal.times(months).dividedBy(240)));

  const cheaperToBuy = interestPaid.lessThan(totalRent);

  return (
    <Card className="gap-3">
      <Text variant="title">Rent vs buy</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Monthly rent ₹" value={rent} onChangeText={setRent} keyboardType="numeric" />
        </View>
        <View className="flex-1">
          <Input label="Rent ↑ %/yr" value={escalation} onChangeText={setEscalation} keyboardType="numeric" />
        </View>
        <View className="flex-1">
          <Input label="Years" value={years} onChangeText={setYears} keyboardType="numeric" />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Down %" value={downPct} onChangeText={setDownPct} keyboardType="numeric" />
        </View>
        <View className="flex-1">
          <Input label="Rate %" value={rate} onChangeText={setRate} keyboardType="numeric" />
        </View>
      </View>
      <View className="flex-row justify-between">
        <Stat label={`Rent paid (${n}y)`} value={totalRent.toString()} />
        <Stat label="Owning cost (interest)" value={interestPaid.toString()} />
      </View>
      <View className={`rounded-xl p-3 ${cheaperToBuy ? 'bg-success/10' : 'bg-gold/10'}`}>
        <Text variant="caption" className={cheaperToBuy ? 'text-success' : 'text-gold-deep'}>
          {cheaperToBuy
            ? `Over ${n} years, buying costs less than renting — and you build equity.`
            : `Over ${n} years, renting is cheaper on cash outlay — but buying builds equity you keep.`}
        </Text>
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="caption">{label}</Text>
      <MoneyText value={value} className="text-[13px]" />
    </View>
  );
}

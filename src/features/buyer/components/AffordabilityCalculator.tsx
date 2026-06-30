import { useState } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { money, round2 } from '@/lib/money';

const toNum = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Affordability by income — how much property a buyer can afford given monthly
 * income, existing EMIs and a down payment. Reverse-EMI math via decimal.js.
 * maxEMI = 50% of income − existing EMIs; maxLoan = EMI·((1+i)^n−1)/(i·(1+i)^n).
 */
export function AffordabilityCalculator({ price }: { price: number }) {
  const [income, setIncome] = useState('100000');
  const [existing, setExisting] = useState('0');
  const [down, setDown] = useState('1000000');
  const [rate, setRate] = useState('9');
  const [years, setYears] = useState('20');

  const foir = 0.5; // share of income available for EMIs
  const maxEmi = round2(money(income).times(foir).minus(money(existing)));
  const months = Math.max(1, Math.round(toNum(years) * 12));
  const i = money(rate).dividedBy(1200);

  let maxLoan = money(0);
  if (maxEmi.greaterThan(0)) {
    if (i.isZero()) {
      maxLoan = round2(maxEmi.times(months));
    } else {
      const pow = i.plus(1).pow(months);
      maxLoan = round2(maxEmi.times(pow.minus(1)).dividedBy(i.times(pow)));
    }
  }
  const maxPrice = round2(maxLoan.plus(money(down)));
  const affordsThis = maxPrice.greaterThanOrEqualTo(money(price));

  return (
    <Card className="gap-3">
      <Text variant="title">Affordability</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Monthly income ₹" value={income} onChangeText={setIncome} keyboardType="numeric" />
        </View>
        <View className="flex-1">
          <Input label="Existing EMIs ₹" value={existing} onChangeText={setExisting} keyboardType="numeric" />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Down payment ₹" value={down} onChangeText={setDown} keyboardType="numeric" />
        </View>
        <View className="flex-1">
          <Input label="Rate %" value={rate} onChangeText={setRate} keyboardType="numeric" />
        </View>
        <View className="flex-1">
          <Input label="Years" value={years} onChangeText={setYears} keyboardType="numeric" />
        </View>
      </View>
      <View className="rounded-xl bg-paper p-3">
        <Text variant="label">You can afford up to</Text>
        <MoneyText value={maxPrice} className="text-[24px]" />
      </View>
      <View className="flex-row justify-between">
        <Stat label="Max EMI" value={maxEmi.greaterThan(0) ? maxEmi.toString() : '0'} />
        <Stat label="Max loan" value={maxLoan.toString()} />
      </View>
      <View className={`rounded-xl p-3 ${affordsThis ? 'bg-success/10' : 'bg-danger/5'}`}>
        <Text variant="caption" className={affordsThis ? 'text-success' : 'text-danger'}>
          {affordsThis
            ? 'This property is within your budget.'
            : 'This property is above your current budget — raise your down payment or tenure.'}
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

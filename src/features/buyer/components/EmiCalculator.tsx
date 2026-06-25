import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/features/content/hooks';
import { emi, money, round2 } from '@/lib/money';

/** EMI Calculator (§5.04) — all math via decimal.js (no float drift). Defaults are admin-editable. */
export function EmiCalculator({ price }: { price: number }) {
  const { get } = useContent();
  const [downPct, setDownPct] = useState('20');
  const [rate, setRate] = useState('9');
  const [years, setYears] = useState('10');
  // Apply admin defaults once content loads; never override a value the user has typed.
  const touched = useRef(false);
  const dDown = get('calc.emi_down_pct');
  const dRate = get('calc.emi_rate');
  const dYears = get('calc.emi_years');
  useEffect(() => {
    if (touched.current) return;
    setDownPct(dDown);
    setRate(dRate);
    setYears(dYears);
  }, [dDown, dRate, dYears]);
  const onEdit = (set: (v: string) => void) => (v: string) => {
    touched.current = true;
    set(v);
  };

  const dp = clamp(downPct, 0, 90);
  const principal = round2(money(price).times(money(100).minus(dp)).dividedBy(100));
  const months = Math.max(1, Math.round(toNum(years) * 12));
  const monthly = emi(principal, toNum(rate), months);
  const total = round2(monthly.times(months));
  const interest = round2(total.minus(principal));

  return (
    <Card className="gap-3">
      <Text variant="title">EMI Calculator</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Down %" value={downPct} onChangeText={onEdit(setDownPct)} keyboardType="numeric" />
        </View>
        <View className="flex-1">
          <Input label="Rate %" value={rate} onChangeText={onEdit(setRate)} keyboardType="numeric" />
        </View>
        <View className="flex-1">
          <Input label="Years" value={years} onChangeText={onEdit(setYears)} keyboardType="numeric" />
        </View>
      </View>

      <View className="rounded-xl bg-paper p-3">
        <Text variant="label">Monthly EMI</Text>
        <MoneyText value={monthly} className="text-[24px]" />
      </View>
      <View className="flex-row justify-between">
        <Stat label="Loan amount" value={principal.toString()} />
        <Stat label="Total interest" value={interest.toString()} />
        <Stat label="Total payable" value={total.toString()} />
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

function toNum(s: string) {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function clamp(s: string, min: number, max: number) {
  return Math.min(max, Math.max(min, toNum(s)));
}

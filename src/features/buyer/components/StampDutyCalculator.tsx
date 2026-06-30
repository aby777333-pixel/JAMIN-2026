import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { useConfig } from '@/features/config/hooks';
import { money, round2 } from '@/lib/money';

interface Rates {
  default: number;
  registration_pct: number;
  states: Record<string, number>;
}

const FALLBACK: Rates = {
  default: 6,
  registration_pct: 1,
  states: { 'Tamil Nadu': 7, Karnataka: 5.6, Maharashtra: 6, Telangana: 5, Kerala: 8 },
};

/** Stamp-duty + registration cost on top of the price. Rates are admin-editable (system_config). */
export function StampDutyCalculator({ price }: { price: number }) {
  const { data: rates = FALLBACK } = useConfig<Rates>('stamp_duty_rates', FALLBACK);
  const states = useMemo(() => Object.keys(rates.states ?? {}), [rates]);
  const [state, setState] = useState<string | null>(null);

  const dutyPct = (state && rates.states?.[state]) ?? rates.default ?? 6;
  const regPct = rates.registration_pct ?? 1;
  const duty = round2(money(price).times(dutyPct).dividedBy(100));
  const reg = round2(money(price).times(regPct).dividedBy(100));
  const total = round2(money(price).plus(duty).plus(reg));

  return (
    <Card className="gap-3">
      <Text variant="title">Stamp duty & registration</Text>
      <Text variant="caption">Pick the state for accurate rates. Defaults to {rates.default ?? 6}%.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        <Chip label="Default" active={!state} onPress={() => setState(null)} />
        {states.map((s) => (
          <Chip key={s} label={s} active={state === s} onPress={() => setState(s)} />
        ))}
      </ScrollView>
      <View className="rounded-xl bg-paper p-3">
        <Text variant="label">All-in acquisition cost</Text>
        <MoneyText value={total} className="text-[24px]" />
      </View>
      <View className="flex-row justify-between">
        <Stat label={`Stamp duty (${dutyPct}%)`} value={duty.toString()} />
        <Stat label={`Registration (${regPct}%)`} value={reg.toString()} />
        <Stat label="Property price" value={String(price)} />
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

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { formatINR, money, round2 } from '@/lib/money';

/**
 * Rental-yield estimator: gross yield % = (rent×12 − annual maintenance) / price × 100.
 * decimal.js math throughout; same Card/Input/output-box signature as the other
 * buyer calculators.
 */
export function RentalYieldCalculator({ price }: { price: number }) {
  const { t } = useTranslation();
  const [rent, setRent] = useState('');
  const [maintenance, setMaintenance] = useState('');

  const monthlyRent = money(toNum(rent));
  const annualNet = round2(monthlyRent.times(12).minus(money(toNum(maintenance))));
  const yieldPct =
    price > 0 ? round2(annualNet.dividedBy(money(price)).times(100)) : money(0);

  return (
    <Card className="gap-3" accent={4}>
      <Text variant="title">{t('calc.rentalYieldTitle', { defaultValue: 'Rental yield' })}</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label={t('calc.monthlyRent', { defaultValue: 'Rent / mo (₹)' })}
            value={rent}
            onChangeText={setRent}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <Input
            label={t('calc.annualMaintenance', { defaultValue: 'Maintenance / yr (₹)' })}
            value={maintenance}
            onChangeText={setMaintenance}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View className="rounded-xl bg-paper p-3">
        <Text variant="label">{t('calc.grossYield', { defaultValue: 'Gross annual yield' })}</Text>
        <Text className="font-mono-bold text-[24px] text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {yieldPct.toFixed(2)}%
        </Text>
      </View>
      {monthlyRent.greaterThan(0) ? (
        <Text variant="caption">
          {t('calc.yieldContext', {
            defaultValue: '{{rent}} rent per month against a {{price}} property.',
            rent: formatINR(monthlyRent),
            price: formatINR(price),
          })}
        </Text>
      ) : null}
      <View className="flex-row justify-between">
        <View>
          <Text variant="caption">{t('calc.netAnnualRent', { defaultValue: 'Net annual rent' })}</Text>
          <MoneyText value={annualNet} className="text-[13px]" />
        </View>
        <View>
          <Text variant="caption">{t('calc.propertyPrice', { defaultValue: 'Property price' })}</Text>
          <MoneyText value={String(price)} className="text-[13px]" />
        </View>
      </View>
    </Card>
  );
}

function toNum(s: string) {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

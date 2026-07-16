import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { money, round2 } from '@/lib/money';

/**
 * Loan-eligibility estimator — all math via decimal.js (no float drift), same
 * container/UX signature as EmiCalculator. Affordable EMI = 50% of monthly
 * income minus existing EMIs (floored at 0), reverse-amortized into the
 * eligible principal: P = EMI × (1 − (1+i)^−n) / i, i = rate/1200.
 */
export function LoanEligibilityCalculator() {
  const { t } = useTranslation();
  const [income, setIncome] = useState('');
  const [existingEmis, setExistingEmis] = useState('');
  const [rate, setRate] = useState('9');
  const [years, setYears] = useState('20');

  const inc = money(toNum(income));
  const obligations = money(toNum(existingEmis));
  let affordable = round2(inc.dividedBy(2).minus(obligations));
  if (affordable.isNegative()) affordable = money(0);

  const months = Math.max(1, Math.round(toNum(years) * 12));
  const i = money(toNum(rate)).dividedBy(1200);
  const loan = i.isZero()
    ? round2(affordable.times(months))
    : round2(affordable.times(money(1).minus(i.plus(1).pow(-months))).dividedBy(i));
  // Lenders typically fund ~80% of the property value (LTV) — budget ≈ loan / 0.8.
  const budget = round2(loan.dividedBy('0.8'));

  return (
    <Card className="gap-3" accent={3}>
      <Text variant="title">
        {t('calc.eligibilityTitle', { defaultValue: 'Loan eligibility' })}
      </Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label={t('calc.monthlyIncome', { defaultValue: 'Income / mo' })}
            value={income}
            onChangeText={setIncome}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <Input
            label={t('calc.existingEmis', { defaultValue: 'EMIs / mo' })}
            value={existingEmis}
            onChangeText={setExistingEmis}
            keyboardType="numeric"
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label={t('calc.ratePct', { defaultValue: 'Rate %' })}
            value={rate}
            onChangeText={setRate}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <Input
            label={t('calc.tenureYears', { defaultValue: 'Years' })}
            value={years}
            onChangeText={setYears}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View className="rounded-xl bg-paper p-3">
        <Text variant="label">{t('calc.eligibleLoan', { defaultValue: 'Eligible loan (approx.)' })}</Text>
        <MoneyText value={loan} className="text-[24px]" />
      </View>
      <View className="flex-row justify-between">
        <Stat
          label={t('calc.affordableEmi', { defaultValue: 'Affordable EMI' })}
          value={affordable.toString()}
        />
        <Stat
          label={t('calc.propertyBudget', { defaultValue: 'Property budget' })}
          value={budget.toString()}
        />
      </View>
      <Text variant="caption">
        {t('calc.eligibilityNote', {
          defaultValue: 'Assumes banks allow up to 50% of income for EMIs and fund 80% of the property value. Indicative only.',
        })}
      </Text>
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

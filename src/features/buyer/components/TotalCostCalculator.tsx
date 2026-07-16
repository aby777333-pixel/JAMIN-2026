import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { money, round2 } from '@/lib/money';

/**
 * True all-in acquisition cost on top of the sticker price — stamp duty,
 * registration, GST and flat legal/other fees, all editable. decimal.js math
 * throughout (no float drift); mirrors StampDutyCalculator's structure.
 */
export function TotalCostCalculator({ price }: { price: number }) {
  const { t } = useTranslation();
  const [stampPct, setStampPct] = useState('7');
  const [regPct, setRegPct] = useState('1');
  const [otherFlat, setOtherFlat] = useState('25000');
  const [gstPct, setGstPct] = useState('0');

  const duty = round2(money(price).times(toNum(stampPct)).dividedBy(100));
  const reg = round2(money(price).times(toNum(regPct)).dividedBy(100));
  const gst = round2(money(price).times(toNum(gstPct)).dividedBy(100));
  const other = round2(money(toNum(otherFlat)));
  const total = round2(money(price).plus(duty).plus(reg).plus(gst).plus(other));

  return (
    <Card className="gap-3" accent={1}>
      <Text variant="title">{t('calc.totalCostTitle', { defaultValue: 'Total cost of ownership' })}</Text>
      <Text variant="caption">
        {t('calc.totalCostHint', { defaultValue: 'Tune the rates for your state — everything updates live.' })}
      </Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label={t('calc.stampPct', { defaultValue: 'Stamp %' })}
            value={stampPct}
            onChangeText={setStampPct}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <Input
            label={t('calc.regPct', { defaultValue: 'Reg. %' })}
            value={regPct}
            onChangeText={setRegPct}
            keyboardType="numeric"
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label={t('calc.otherFees', { defaultValue: 'Legal/other (₹)' })}
            value={otherFlat}
            onChangeText={setOtherFlat}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <Input
            label={t('calc.gstPct', { defaultValue: 'GST %' })}
            value={gstPct}
            onChangeText={setGstPct}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View className="gap-2 rounded-xl bg-paper p-3">
        <CostRow label={t('calc.propertyPrice', { defaultValue: 'Property price' })} value={String(price)} />
        <CostRow label={t('calc.stampDuty', { defaultValue: 'Stamp duty' })} value={duty.toString()} />
        <CostRow label={t('calc.registration', { defaultValue: 'Registration' })} value={reg.toString()} />
        {gst.isZero() ? null : (
          <CostRow label={t('calc.gst', { defaultValue: 'GST' })} value={gst.toString()} />
        )}
        <CostRow label={t('calc.otherFeesRow', { defaultValue: 'Legal & other' })} value={other.toString()} />
        <View className="flex-row items-center justify-between border-t border-line pt-2">
          <Text variant="title" className="text-[14px]">
            {t('calc.total', { defaultValue: 'Total' })}
          </Text>
          <MoneyText value={total} className="font-mono-bold text-[18px] text-gold-deep" />
        </View>
      </View>
    </Card>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="caption">{label}</Text>
      <MoneyText value={value} className="text-[13px]" />
    </View>
  );
}

function toNum(s: string) {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

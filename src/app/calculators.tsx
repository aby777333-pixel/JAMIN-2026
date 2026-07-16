import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { AffordabilityCalculator } from '@/features/buyer/components/AffordabilityCalculator';
import { EmiCalculator } from '@/features/buyer/components/EmiCalculator';
import { LoanEligibilityCalculator } from '@/features/buyer/components/LoanEligibilityCalculator';
import { RentalYieldCalculator } from '@/features/buyer/components/RentalYieldCalculator';
import { RentVsBuyCalculator } from '@/features/buyer/components/RentVsBuyCalculator';
import { RoiCalculator } from '@/features/buyer/components/RoiCalculator';
import { StampDutyCalculator } from '@/features/buyer/components/StampDutyCalculator';
import { TotalCostCalculator } from '@/features/buyer/components/TotalCostCalculator';
import { color } from '@/theme/tokens';

type CalcKey = 'emi' | 'eligibility' | 'affordability' | 'stamp' | 'total' | 'rentbuy' | 'roi' | 'yield';

const TILES: { key: CalcKey; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'emi', icon: 'calculator', label: 'EMI' },
  { key: 'eligibility', icon: 'business', label: 'Loan eligibility' },
  { key: 'affordability', icon: 'wallet', label: 'Affordability' },
  { key: 'stamp', icon: 'document-text', label: 'Stamp duty' },
  { key: 'total', icon: 'receipt', label: 'Total cost' },
  { key: 'rentbuy', icon: 'swap-horizontal', label: 'Rent vs buy' },
  { key: 'roi', icon: 'trending-up', label: 'ROI' },
  { key: 'yield', icon: 'cash', label: 'Rental yield' },
];

/**
 * Calculators hub — every financial tool in one tile grid (toolkit-style),
 * working standalone with a user-entered price instead of a specific listing.
 * Pure composition of the existing calculator components; no new math here.
 */
export default function Calculators() {
  const { t } = useTranslation();
  const [priceText, setPriceText] = useState('5000000');
  const [selected, setSelected] = useState<CalcKey>('emi');

  const price = Number(priceText.replace(/[,\s₹]/g, '')) || 0;

  return (
    <Screen contentClassName="pb-12 gap-4" keyboardAvoiding>
      <BackHeader title={t('calculators.title', { defaultValue: 'Calculators' })} />
      <Text variant="caption">
        {t('calculators.subtitle', {
          defaultValue: 'Every JAMIN financial tool in one place. Set a property price, pick a tool.',
        })}
      </Text>

      <Input
        label={t('calculators.price', { defaultValue: 'Property price (₹)' })}
        value={priceText}
        onChangeText={setPriceText}
        keyboardType="numeric"
        inputMode="numeric"
      />

      <View className="flex-row flex-wrap justify-between">
        {TILES.map((tile) => {
          const active = selected === tile.key;
          return (
            <Pressable key={tile.key} onPress={() => setSelected(tile.key)} className="mb-3 w-[23%]">
              <Card
                className={`items-center gap-1.5 px-1 py-3 ${active ? 'border-red bg-red/5' : ''}`}>
                <View
                  className={`h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-red' : 'bg-red/10'}`}>
                  <Ionicons name={tile.icon} size={19} color={active ? '#FFFFFF' : color.red} />
                </View>
                <Text
                  className={`text-center text-[10px] font-semibold ${active ? 'text-red' : 'text-ink'}`}
                  numberOfLines={2}>
                  {t(`calculators.tiles.${tile.key}`, { defaultValue: tile.label })}
                </Text>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {selected === 'emi' ? <EmiCalculator price={price} /> : null}
      {selected === 'eligibility' ? <LoanEligibilityCalculator /> : null}
      {selected === 'affordability' ? <AffordabilityCalculator price={price} /> : null}
      {selected === 'stamp' ? <StampDutyCalculator price={price} /> : null}
      {selected === 'total' ? <TotalCostCalculator price={price} /> : null}
      {selected === 'rentbuy' ? <RentVsBuyCalculator price={price} /> : null}
      {selected === 'roi' ? <RoiCalculator price={price} /> : null}
      {selected === 'yield' ? <RentalYieldCalculator price={price} /> : null}
    </Screen>
  );
}

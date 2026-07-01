import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { toMulank } from '@/features/astro/engine';
import { FACING_ABBR, FACING_RATING, FACINGS, facingKey, type FacingRating } from '@/features/astro/vastu';
import { ConsultSheet } from '@/features/invest/ConsultSheet';
import { color } from '@/theme/tokens';

/**
 * Vastu & Muhurat — a client-only cultural guide for buyers. All copy is driven
 * by i18n (locales/*.json → `vastu.*`) so it renders in the user's chosen
 * language. No DB, no network — pure static reference + a numerology calculator.
 */

const RATING_TONE: Record<FacingRating, 'available' | 'reserved' | 'neutral'> = {
  auspicious: 'available',
  neutral: 'neutral',
  caution: 'reserved',
};

export default function VastuScreen() {
  const { t } = useTranslation();
  const [active, setActive] = useState<string>(FACINGS[0]);
  const [plotNo, setPlotNo] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [consult, setConsult] = useState(false);

  const key = useMemo(() => facingKey(active), [active]);
  const rating = FACING_RATING[active as keyof typeof FACING_RATING] ?? 'neutral';
  const muhuratTips = t('vastu.muhuratTips', { returnObjects: true }) as string[];

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title={t('vastu.title')} />

      <Card className="gap-2 border-gold/50 bg-[#FDF3D8]">
        <View className="flex-row items-center gap-2">
          <Ionicons name="compass" size={18} color={color.goldDeep} />
          <Text variant="title" className="flex-1">
            {t('vastu.heroTitle')}
          </Text>
        </View>
        <Text variant="caption">{t('vastu.heroBody')}</Text>
      </Card>

      {/* Plot facing / direction guide */}
      <View className="gap-2">
        <Text variant="label">{t('vastu.facingHeading')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {FACINGS.map((f) => (
            <Chip key={f} label={FACING_ABBR[f]} active={active === f} onPress={() => setActive(f)} />
          ))}
        </View>
        <Card className="gap-2">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="title" className="flex-1">
              {t(`vastu.directions.${key}.name`)}
            </Text>
            <Badge label={t(`vastu.ratings.${rating}`)} tone={RATING_TONE[rating]} />
          </View>
          <Text variant="caption">
            {t('vastu.presiding', { deity: t(`vastu.directions.${key}.deity`) })}
          </Text>
          <Text variant="body">{t(`vastu.directions.${key}.note`)}</Text>
        </Card>
      </View>

      {/* Numerology calculator */}
      <View className="gap-2">
        <Text variant="label">{t('vastu.numerologyHeading')}</Text>
        <Card className="gap-3">
          <Input
            label={t('vastu.numInputLabel')}
            placeholder={t('vastu.numInputPlaceholder')}
            keyboardType="default"
            value={plotNo}
            onChangeText={setPlotNo}
          />
          <Button
            title={t('vastu.numButton')}
            variant="secondary"
            onPress={() => setResult(plotNo.match(/\d/) ? toMulank(plotNo) : null)}
            left={<Ionicons name="sparkles" size={16} color={color.ink} />}
          />
          {plotNo.length > 0 && result == null ? (
            <Text variant="caption" className="text-danger">
              {t('vastu.numNeedDigit')}
            </Text>
          ) : null}
          {result != null ? (
            <View className="gap-1 rounded-2xl bg-paper p-3">
              <Text variant="title">
                {t('vastu.mulankLabel', { n: result, ruler: t(`vastu.mulank.${result}.ruler`) })}
              </Text>
              <Text variant="body">{t(`vastu.mulank.${result}.vibe`)}</Text>
            </View>
          ) : null}
        </Card>
      </View>

      {/* Muhurat guidance */}
      <View className="gap-2">
        <Text variant="label">{t('vastu.muhuratHeading')}</Text>
        <Card className="gap-2.5">
          {(Array.isArray(muhuratTips) ? muhuratTips : []).map((tip) => (
            <View key={tip} className="flex-row gap-2">
              <Ionicons name="calendar-outline" size={16} color={color.red} style={{ marginTop: 2 }} />
              <Text variant="body" className="flex-1">
                {tip}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      <Button
        title="Talk to a Vastu expert"
        variant="outline"
        left={<Ionicons name="chatbubble-ellipses" size={16} color={color.ink} />}
        onPress={() => setConsult(true)}
      />

      <Text variant="caption" className="px-1 text-center">
        {t('vastu.disclaimer')}
      </Text>

      <ConsultSheet visible={consult} onClose={() => setConsult(false)} defaultTopic="Vastu" />
    </Screen>
  );
}

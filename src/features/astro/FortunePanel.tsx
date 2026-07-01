import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';
import { propertyFortune, rashiHarmony, RASHIS, type FortuneInput } from './engine';

/**
 * "Auspicious Insights" — a positive-only, feel-good astrological reading for a
 * property. Deterministic (see engine.ts), purely decorative, no network/DB.
 */
export function FortunePanel({ property }: { property: FortuneInput }) {
  const { t } = useTranslation();
  const [rashi, setRashi] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const f = useMemo(() => propertyFortune(property), [property]);

  const facets: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'planet', label: t('astro.fortune.rulingPlanet'), value: `${f.planet} (${f.graha})` },
    { icon: 'flame', label: t('astro.fortune.element'), value: f.element.split(' — ')[0] },
    { icon: 'diamond', label: t('astro.fortune.luckyGem'), value: f.gem },
    { icon: 'compass', label: t('astro.fortune.wealthDirection'), value: f.direction.split(' — ')[0] },
    { icon: 'star', label: t('astro.fortune.birthStar'), value: f.nakshatra.split(' — ')[0] },
    { icon: 'sparkles', label: t('astro.fortune.prosperityNo'), value: String(f.mulank) },
    { icon: 'color-palette', label: t('astro.fortune.luckyColour'), value: f.color },
  ];

  return (
    <Card className="gap-3 border-gold/50 bg-[#FDF3D8]">
      <View className="flex-row items-center gap-2">
        <Ionicons name="sparkles" size={18} color={color.goldDeep} />
        <Text variant="title" className="flex-1">
          {t('astro.fortune.title')}
        </Text>
        <View className="items-end">
          <Text className="font-mono-bold text-[22px] text-gold-deep">{f.score}</Text>
          <Text variant="caption">{t('astro.fortune.index')}</Text>
        </View>
      </View>

      <View className="self-start rounded-full bg-gold/25 px-3 py-1">
        <Text className="text-[12px] font-semibold text-gold-deep">{f.band}</Text>
      </View>

      <Text variant="body" className="text-ink">
        {f.blessing}
      </Text>

      {/* Facet grid */}
      <View className="flex-row flex-wrap">
        {facets.map((x) => (
          <View key={x.label} className="w-1/2 flex-row items-start gap-2 py-1.5 pr-2">
            <Ionicons name={x.icon} size={15} color={color.goldDeep} style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text variant="caption">{x.label}</Text>
              <Text className="text-[13px] font-semibold text-ink">{x.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Auspicious yoga highlight */}
      <View className="flex-row items-center gap-2 rounded-2xl bg-surface/70 p-3">
        <Ionicons name="ribbon" size={16} color={color.red} />
        <Text variant="body" className="flex-1 text-ink">
          {f.yoga}
        </Text>
      </View>

      {/* Positive highlights */}
      <View className="gap-1.5">
        {f.highlights.map((h) => (
          <View key={h} className="flex-row gap-2">
            <Ionicons name="checkmark-circle" size={15} color={color.success} style={{ marginTop: 2 }} />
            <Text variant="caption" className="flex-1 text-ink">
              {h}
            </Text>
          </View>
        ))}
      </View>

      {/* Personalise with rashi */}
      <View className="gap-2 border-t border-gold/30 pt-3">
        <Text
          variant="label"
          onPress={() => setOpen((v) => !v)}
          className="text-gold-deep">
          {open ? '▾ ' : '▸ '}{t('astro.fortune.personalise')}
        </Text>
        {open ? (
          <>
            <View className="flex-row flex-wrap gap-2">
              {RASHIS.map((r) => (
                <Chip
                  key={r.key}
                  label={`${r.name}`}
                  active={rashi === r.key}
                  onPress={() => setRashi(r.key)}
                />
              ))}
            </View>
            {rashi ? (
              <View className="rounded-2xl bg-surface/80 p-3">
                <Text variant="body" className="text-ink">
                  {rashiHarmony(rashi, f)}
                </Text>
              </View>
            ) : (
              <Text variant="caption">{t('astro.fortune.tapMoon')}</Text>
            )}
          </>
        ) : null}
      </View>

      <Text variant="caption" className="text-muted">
        {t('astro.fortune.disclaimer')}
      </Text>
    </Card>
  );
}

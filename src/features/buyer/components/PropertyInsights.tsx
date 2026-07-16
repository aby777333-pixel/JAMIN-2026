import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Safe number parse — attrs values arrive as unknown (number or string, maybe with ₹/commas). */
function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toText(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

const DISTANCES: { key: string; label: string; icon: IconName }[] = [
  { key: 'metro_km', label: 'Metro', icon: 'train' },
  { key: 'highway_km', label: 'Highway', icon: 'car' },
  { key: 'airport_km', label: 'Airport', icon: 'airplane' },
  { key: 'school_km', label: 'School', icon: 'school' },
  { key: 'hospital_km', label: 'Hospital', icon: 'medkit' },
  { key: 'shopping_km', label: 'Shopping', icon: 'cart' },
];

/**
 * Data-driven neighbourhood/value insights from optional admin-set attrs keys
 * (guideline_value, market_value, flood_zone, *_km distances, infra_projects).
 * Renders nothing when the admin hasn't filled any of them — zero clutter.
 */
export function PropertyInsights({ attrs }: { attrs: Record<string, unknown> }) {
  const { t } = useTranslation();

  const guideline = toNum(attrs['guideline_value']);
  const market = toNum(attrs['market_value']);
  const flood = toText(attrs['flood_zone']);
  const infra = toText(attrs['infra_projects']);
  const distances = DISTANCES.map((d) => ({ ...d, km: toNum(attrs[d.key]) })).filter(
    (d): d is (typeof DISTANCES)[number] & { km: number } => d.km != null,
  );

  if (guideline == null && market == null && !flood && !infra && distances.length === 0) {
    return null;
  }

  return (
    <Card className="gap-3" accent={6}>
      <Text variant="title">{t('property.insights', { defaultValue: 'Property insights' })}</Text>

      {guideline != null || market != null ? (
        <View className="gap-2">
          {guideline != null ? (
            <View className="flex-row items-center justify-between">
              <Text variant="caption">
                {t('property.guidelineValue', { defaultValue: 'Guideline value' })}
              </Text>
              <MoneyText value={guideline} className="text-[14px]" />
            </View>
          ) : null}
          {market != null ? (
            <View className="flex-row items-center justify-between">
              <Text variant="caption">
                {t('property.marketValue', { defaultValue: 'Market value' })}
              </Text>
              <MoneyText value={market} className="text-[14px]" />
            </View>
          ) : null}
        </View>
      ) : null}

      {distances.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {distances.map((d) => (
            <View
              key={d.key}
              className="flex-row items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5"
            >
              <Ionicons name={d.icon} size={14} color={color.goldDeep} />
              <Text variant="caption" className="text-ink">
                {d.label} {d.km} km
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {flood ? (
        <View className="flex-row items-center gap-2 rounded-xl bg-warn/10 px-3 py-2.5">
          <Ionicons name="warning" size={18} color={color.warn} />
          <Text variant="caption" className="flex-1 text-ink">
            {t('property.floodZone', { defaultValue: 'Flood zone' })}: {flood}
          </Text>
        </View>
      ) : null}

      {infra ? (
        <View className="gap-1">
          <Text variant="label">
            {t('property.infraProjects', { defaultValue: 'Nearby infrastructure' })}
          </Text>
          <Text variant="body">{infra}</Text>
        </View>
      ) : null}
    </Card>
  );
}

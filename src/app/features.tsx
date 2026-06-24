import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useFeatures, type AppFeature } from '@/features/catalog/api';
import { color } from '@/theme/tokens';

const CATEGORY: Record<string, { label: string; tint: string }> = {
  core: { label: 'Platform', tint: color.red },
  buyer: { label: 'For buyers', tint: '#2E7D32' },
  partner: { label: 'For partners', tint: color.goldDeep },
  admin: { label: 'Administration', tint: '#5B5BD6' },
  ai: { label: 'AI', tint: '#0E7C86' },
};

const ORDER = ['core', 'buyer', 'partner', 'ai', 'admin'];

/**
 * "What's included" — the full, dynamic feature catalog (MOD16). Visible to every
 * role; the list is driven by app_features so the Super Admin controls it from the
 * web admin (Features tab) with no code change.
 */
export default function FeaturesScreen() {
  const { data: features = [], isLoading } = useFeatures();

  const groups = ORDER.map((cat) => ({
    cat,
    items: features.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0);
  // Any unknown categories fall through into their own groups.
  const known = new Set(ORDER);
  const extra = features.filter((f) => !known.has(f.category));
  if (extra.length) groups.push({ cat: 'other', items: extra });

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title="What's included" />
      <Text variant="body" className="text-muted">
        Everything JAMIN Properties offers. Your access depends on your role — partners and
        admins unlock more.
      </Text>

      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : (
        groups.map((g) => {
          const meta = CATEGORY[g.cat] ?? { label: 'More', tint: color.ink };
          return (
            <View key={g.cat} className="gap-2">
              <Text variant="label" style={{ color: meta.tint }}>
                {meta.label}
              </Text>
              {g.items.map((f) => (
                <FeatureRow key={f.id} feature={f} tint={meta.tint} />
              ))}
            </View>
          );
        })
      )}
    </Screen>
  );
}

function FeatureRow({ feature, tint }: { feature: AppFeature; tint: string }) {
  return (
    <Card className="flex-row items-start gap-3">
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tint}1A` }}>
        <Ionicons
          name={(feature.icon as keyof typeof Ionicons.glyphMap) ?? 'cube'}
          size={20}
          color={tint}
        />
      </View>
      <View className="flex-1">
        <Text variant="title" className="text-[15px]">
          {feature.name}
        </Text>
        {feature.description ? (
          <Text variant="caption" className="mt-0.5">
            {feature.description}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

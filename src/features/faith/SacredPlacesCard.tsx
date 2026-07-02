import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';
import { compassPoint, qiblaBearing, sacredPlaceLinks } from './engine';

/**
 * Faith & practicality card for a property (SuperPrompt: we sell to everyone):
 * • Sacred places nearby — one-tap map searches for temples, churches, mosques
 *   and gurdwaras around the plot (no POI database needed).
 * • Qibla bearing from the exact coordinates (prayer-room planning).
 * • Land practicals — surfaced from admin/seller-set attrs (Borewell, Soil,
 *   Flood safety, Road access, Water, Electricity) when present.
 * Renders nothing without coordinates, so existing listings are unaffected.
 */
export function SacredPlacesCard({
  lat,
  lng,
  attrs,
}: {
  lat?: number | null;
  lng?: number | null;
  attrs?: Record<string, unknown> | null;
}) {
  if (lat == null || lng == null) return null;

  const bearing = qiblaBearing(lat, lng);
  const links = sacredPlaceLinks(lat, lng);

  // Practicality attributes — shown only when the listing carries them.
  const PRACTICAL_KEYS = ['Borewell', 'Well', 'Water', 'Soil', 'Flood safe', 'FloodSafe', 'Road access', 'RoadAccess', 'Electricity'];
  const practicals = Object.entries(attrs ?? {}).filter(([k]) =>
    PRACTICAL_KEYS.some((p) => p.toLowerCase() === k.toLowerCase()),
  );

  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open maps');
    }
  }

  return (
    <Card className="gap-3">
      <Text variant="label">For every family 🙏</Text>

      {/* Sacred places nearby */}
      <View className="flex-row flex-wrap gap-2">
        {links.map((l) => (
          <Pressable
            key={l.key}
            onPress={() => open(l.url)}
            className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2.5">
            <Ionicons name={l.icon as keyof typeof Ionicons.glyphMap} size={15} color={color.red} />
            <Text className="text-[13px] font-semibold text-ink">{l.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Qibla */}
      <View className="flex-row items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2.5">
        <Ionicons name="compass" size={18} color={color.goldDeep} />
        <View className="flex-1">
          <Text variant="title" className="text-[13px]">Qibla direction</Text>
          <Text variant="caption">
            {Math.round(bearing)}° from true north ({compassPoint(bearing)}) — for prayer-room planning
          </Text>
        </View>
      </View>

      {/* Land practicals (attrs-driven) */}
      {practicals.length ? (
        <View className="gap-1">
          <Text variant="caption">Practicality checks</Text>
          <View className="flex-row flex-wrap gap-2">
            {practicals.map(([k, v]) => (
              <View key={k} className="flex-row items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1">
                <Ionicons name="checkmark-circle" size={12} color={color.goldDeep} />
                <Text className="text-[11px] font-medium text-ink">
                  {k}: {String(v)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

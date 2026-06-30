import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

/**
 * Canonical scorecard dimensions (0–5). Admin-set per project (projects.neighborhood).
 * Original keys (schools/healthcare/connectivity/safety/utilities) are preserved so
 * existing data keeps rendering; new POI categories are additive.
 */
export const NEIGHBORHOOD_DIMENSIONS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  // Daily needs & living
  { key: 'schools', label: 'Schools', icon: 'school' },
  { key: 'healthcare', label: 'Hospitals', icon: 'medkit' },
  { key: 'medical_stores', label: 'Medical stores', icon: 'medical' },
  { key: 'markets', label: 'Markets & shopping', icon: 'cart' },
  { key: 'banks', label: 'Banks & ATMs', icon: 'card' },
  { key: 'restaurants', label: 'Restaurants', icon: 'restaurant' },
  { key: 'parks', label: 'Parks', icon: 'leaf' },
  { key: 'walkability', label: 'Walkability', icon: 'walk' },
  { key: 'safety', label: 'Safety', icon: 'shield-checkmark' },
  { key: 'utilities', label: 'Water & power', icon: 'water' },
  // Transit & connectivity
  { key: 'connectivity', label: 'Commute', icon: 'navigate' },
  { key: 'bus_stand', label: 'Bus stand', icon: 'bus' },
  { key: 'railway', label: 'Railway station', icon: 'train' },
  { key: 'airport', label: 'Airport', icon: 'airplane' },
  { key: 'taxi', label: 'Taxi stand', icon: 'car' },
  { key: 'autorickshaw', label: 'Auto-rickshaw', icon: 'car-sport' },
  { key: 'highway', label: 'Highway access', icon: 'trail-sign' },
  // Places of worship
  { key: 'temples', label: 'Temples', icon: 'flame' },
  { key: 'churches', label: 'Churches', icon: 'business' },
  { key: 'mosques', label: 'Mosques', icon: 'moon' },
];

export function NeighborhoodScores({ scores }: { scores?: Record<string, number> | null }) {
  if (!scores) return null;
  const rows = NEIGHBORHOOD_DIMENSIONS.filter((d) => typeof scores[d.key] === 'number');
  if (rows.length === 0) return null;

  return (
    <Card className="gap-3">
      <Text variant="title" className="text-[14px]">Neighborhood</Text>
      {rows.map((d) => {
        const v = Math.max(0, Math.min(5, Number(scores[d.key])));
        return (
          <View key={d.key} className="flex-row items-center gap-3">
            <Ionicons name={d.icon} size={16} color={color.muted} />
            <Text variant="caption" className="w-28">{d.label}</Text>
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
              <View className="h-2 rounded-full bg-gold" style={{ width: `${(v / 5) * 100}%` }} />
            </View>
            <Text className="font-mono text-[12px] text-ink">{v.toFixed(1)}</Text>
          </View>
        );
      })}
    </Card>
  );
}

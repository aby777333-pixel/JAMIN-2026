import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

/** Canonical scorecard dimensions (0–5). Admin-set per project (projects.neighborhood). */
export const NEIGHBORHOOD_DIMENSIONS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'schools', label: 'Schools', icon: 'school' },
  { key: 'healthcare', label: 'Healthcare', icon: 'medkit' },
  { key: 'connectivity', label: 'Connectivity', icon: 'bus' },
  { key: 'safety', label: 'Safety', icon: 'shield-checkmark' },
  { key: 'utilities', label: 'Water & power', icon: 'water' },
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

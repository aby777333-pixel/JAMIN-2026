import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

/**
 * Calm navigation row — neutral icon chip, title, optional sub-line, chevron.
 * The single list style used across Account / Activity so secondary functions
 * read as a quiet directory instead of a tile wall.
 */
export function ListRow({
  icon,
  label,
  sub,
  onPress,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress: () => void;
  right?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card className="flex-row items-center gap-3 py-3.5">
        <View className="h-10 w-10 items-center justify-center rounded-xl border border-line bg-paper">
          <Ionicons name={icon} size={18} color={color.ink} />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="title" className="text-[15px]" numberOfLines={1}>
            {label}
          </Text>
          {sub ? (
            <Text variant="caption" numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
        </View>
        {right ?? <Ionicons name="chevron-forward" size={18} color={color.muted} />}
      </Card>
    </Pressable>
  );
}

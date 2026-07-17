import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { accentFor, color } from '@/theme/tokens';

/**
 * Calm navigation row — icon chip, title, optional sub-line, chevron.
 * The single list style used across Account / Activity for rows that need a
 * descriptive sub-line. Pass `accent` (palette index, see theme `category`)
 * to tint the icon chip so rows share the tile grids' colour language.
 */
export function ListRow({
  icon,
  label,
  sub,
  onPress,
  right,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress: () => void;
  right?: ReactNode;
  accent?: number;
}) {
  const a = accent === undefined ? null : accentFor(accent);
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card className="flex-row items-center gap-3 py-3.5">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl border border-line bg-paper"
          style={a ? { backgroundColor: a.soft, borderColor: `${a.main}40` } : null}>
          <Ionicons name={icon} size={18} color={a ? a.main : color.ink} />
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

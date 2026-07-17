import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { accentFor, color } from '@/theme/tokens';

/**
 * TileGrid + ToolTile — the single square-card language for every tool /
 * shortcut grid in the app (owner brief: "standardize and colorize the square
 * tabs"). Fixed column widths via percentage cells so every tile in a grid is
 * exactly the same size regardless of label length; the label area is a fixed
 * two-line box so rows always align.
 *
 * Purely presentational: tiles only call the `onPress` they are given, so
 * swapping a ListRow/Pressable for a ToolTile never changes behaviour.
 */
export function TileGrid({ children }: { children: ReactNode }) {
  return <View className="-mx-1.5 flex-row flex-wrap">{children}</View>;
}

export function ToolTile({
  icon,
  label,
  accent = 0,
  cols = 4,
  active = false,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Palette index from theme accents — pick per functional category. */
  accent?: number;
  /** Columns in the parent TileGrid (3 for primary shortcuts, 4 for tool walls). */
  cols?: 3 | 4;
  /** Selected state — solid accent chip, tinted card, accent label. */
  active?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const a = accentFor(accent);
  return (
    <View style={{ width: `${100 / cols}%` }} className="px-1.5 pb-3">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        className="items-center gap-1.5 rounded-2xl border px-1 py-3 active:opacity-80"
        style={{
          backgroundColor: active ? a.soft : color.surface,
          borderColor: active ? a.main : `${a.main}40`,
          shadowColor: a.main,
          shadowOpacity: active ? 0.25 : 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: active ? 3 : 1,
        }}>
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: active ? a.main : a.soft }}>
          <Ionicons name={icon} size={19} color={active ? '#FFFFFF' : a.main} />
        </View>
        <View className="h-8 justify-center">
          <Text
            className="text-center text-[11px] font-semibold leading-[14px]"
            style={{ color: active ? a.main : color.ink }}
            numberOfLines={2}>
            {label}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

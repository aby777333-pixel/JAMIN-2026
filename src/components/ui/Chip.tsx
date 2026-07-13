import { Pressable } from 'react-native';

import { Text } from './Text';
import { cn } from '@/lib/cn';
import { tap } from '@/lib/haptics';
import { color } from '@/theme/tokens';

/**
 * Selectable pill — calm brand treatment (simplification redesign): quiet
 * surface at rest, solid crimson when active. The earlier hash-toned rainbow
 * fills are retired; the `tone` prop is still accepted (many callers pass it)
 * but no longer drives colour, so nothing breaks.
 */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Legacy palette index — accepted for compatibility, no longer used. */
  tone?: number;
}) {
  return (
    <Pressable
      onPress={onPress ? () => { tap(); onPress(); } : undefined}
      className="rounded-full border px-3.5 py-2"
      style={
        active
          ? { backgroundColor: color.red, borderColor: color.red }
          : { backgroundColor: color.surface, borderColor: color.line }
      }>
      <Text
        className={cn('text-[13px]', active ? 'font-semibold' : 'font-medium')}
        style={{ color: active ? '#FFFFFF' : color.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

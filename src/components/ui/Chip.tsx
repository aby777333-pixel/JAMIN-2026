import { Pressable } from 'react-native';

import { Text } from './Text';
import { cn } from '@/lib/cn';
import { tap } from '@/lib/haptics';
import { accentFor } from '@/theme/tokens';

/** Stable label → palette slot, so untoned chips get a consistent colour. */
function hashTone(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return h % 8;
}

/**
 * Selectable pill: subtle tinted fill at rest, solid accent fill when active.
 * Pass `tone` (a palette index) to pin a group to one hue; without it the
 * colour derives from the label so pickers are colourful everywhere.
 */
export function Chip({
  label,
  active,
  onPress,
  tone,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: number;
}) {
  const a = accentFor(tone ?? hashTone(label));
  return (
    <Pressable
      onPress={onPress ? () => { tap(); onPress(); } : undefined}
      className="rounded-full border px-3.5 py-2"
      style={
        active
          ? { backgroundColor: a.main, borderColor: a.main }
          : { backgroundColor: a.soft, borderColor: a.main + '4D' }
      }>
      <Text
        className={cn('text-[13px]', active ? 'font-semibold' : 'font-medium')}
        style={{ color: active ? '#FFFFFF' : undefined }}>
        {label}
      </Text>
    </Pressable>
  );
}

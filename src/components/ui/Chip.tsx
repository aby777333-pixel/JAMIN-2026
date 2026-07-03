import { Pressable } from 'react-native';

import { Text } from './Text';
import { cn } from '@/lib/cn';
import { accentFor } from '@/theme/tokens';

/**
 * Selectable pill. Pass `tone` (a palette index) for the colorful variant:
 * subtle tinted fill at rest, solid accent fill when active. Without `tone`
 * it keeps the classic neutral look (surface → ink) used across the app.
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
  if (tone === undefined) {
    return (
      <Pressable
        onPress={onPress}
        className={cn(
          'rounded-full border px-3.5 py-2',
          active ? 'border-ink bg-ink' : 'border-line bg-surface',
        )}>
        <Text className={cn('text-[13px] font-medium', active ? 'text-white' : 'text-ink')}>
          {label}
        </Text>
      </Pressable>
    );
  }

  const a = accentFor(tone);
  return (
    <Pressable
      onPress={onPress}
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

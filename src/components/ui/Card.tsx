import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';
import { accentFor } from '@/theme/tokens';

/**
 * Rounded square, hairline border, soft elevation — the §1 card signature.
 * Pass `accent` (a palette index) for the colourful block variant: tinted
 * border, solid accent bar on the left, and a soft glow in the same hue.
 */
export function Card({
  className,
  style,
  accent,
  ...rest
}: ViewProps & { className?: string; accent?: number }) {
  // `cn` is a plain joiner (no tailwind-merge), so a passed `bg-*` would otherwise
  // collide with the default `bg-surface` and NativeWind resolves it unpredictably
  // (this was rendering `bg-charcoal` cards white). Drop the default bg when the
  // caller supplies their own background.
  const hasBg = /(^|\s)bg-/.test(className ?? '');
  const a = accent === undefined ? null : accentFor(accent);
  return (
    <View
      className={cn('rounded-2xl border border-line p-4', !hasBg && 'bg-surface', className)}
      // Merge (not replace) caller styles so accent tints keep the elevation.
      style={[
        {
          shadowColor: a ? a.main : '#202020',
          shadowOpacity: a ? 0.3 : 0.05,
          shadowRadius: a ? 10 : 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: a ? 4 : 2,
        },
        a ? { borderColor: a.main + '55', borderLeftWidth: 4, borderLeftColor: a.main } : null,
        style,
      ]}
      {...rest}
    />
  );
}

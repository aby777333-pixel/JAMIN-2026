import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';
import { accentFor } from '@/theme/tokens';

/**
 * Auto-accent cycler — provided by Screen so that every Card on a page picks
 * the next hue from the palette in layout order (owner request: "make the app
 * blocks in all pages colourful"). Each Card grabs its index ONCE on mount
 * (useState initializer), so re-renders never shuffle colours.
 */
const AccentCycle = createContext<{ next: () => number } | null>(null);

export function AccentCycleProvider({ children }: { children: ReactNode }) {
  const counter = useRef(0);
  const value = useMemo(() => ({ next: () => counter.current++ }), []);
  return <AccentCycle.Provider value={value}>{children}</AccentCycle.Provider>;
}

/**
 * Rounded square, hairline border, soft elevation — the §1 card signature.
 * Pass `accent` (a palette index) for the strong colourful variant: tinted
 * border, solid accent bar on the left, and a soft glow in the same hue.
 * Plain Cards inside a Screen get an automatic SOFT accent (tinted fill +
 * hairline + slim bar) cycling through the palette; cards that set their own
 * `bg-*` class or explicit `accent` are left exactly as designed.
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
  const cycle = useContext(AccentCycle);
  // Stable per-mount auto index — only for plain cards (no accent, no custom bg).
  const [autoIdx] = useState<number | null>(() =>
    accent === undefined && !hasBg && cycle ? cycle.next() : null,
  );
  const explicit = accent === undefined ? null : accentFor(accent);
  const auto = explicit === null && autoIdx !== null ? accentFor(autoIdx) : null;
  const a = explicit ?? auto;
  return (
    <View
      className={cn('rounded-2xl border border-line p-4', !hasBg && 'bg-surface', className)}
      // Merge (not replace) caller styles so accent tints keep the elevation.
      style={[
        {
          shadowColor: a ? a.main : '#202020',
          shadowOpacity: explicit ? 0.3 : 0.05,
          shadowRadius: explicit ? 10 : 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: explicit ? 4 : 2,
        },
        explicit
          ? { borderColor: explicit.main + '55', borderLeftWidth: 4, borderLeftColor: explicit.main }
          : null,
        auto
          ? {
              backgroundColor: auto.soft,
              borderColor: auto.main + '40',
              borderLeftWidth: 3,
              borderLeftColor: auto.main + 'B3',
            }
          : null,
        style,
      ]}
      {...rest}
    />
  );
}

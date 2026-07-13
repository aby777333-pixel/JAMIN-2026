import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
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
 * Pass `accent` (a palette index) for the tinted variant: tinted border and a
 * solid accent bar on the left. Plain Cards render a calm white surface —
 * the earlier automatic palette-cycling accent is retired per the
 * simplification brief ("calm layouts, no decorative badges"); the cycle
 * provider stays mounted so explicit accents keep their stable behaviour.
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
  // Kept (unused for styling) so provider identity and mount behaviour are unchanged.
  useContext(AccentCycle);
  const explicit = accent === undefined ? null : accentFor(accent);
  const a = explicit;
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
        style,
      ]}
      {...rest}
    />
  );
}

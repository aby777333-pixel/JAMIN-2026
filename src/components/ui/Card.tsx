import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

/** Rounded square, hairline border, soft elevation — the §1 card signature. */
export function Card({ className, ...rest }: ViewProps & { className?: string }) {
  // `cn` is a plain joiner (no tailwind-merge), so a passed `bg-*` would otherwise
  // collide with the default `bg-surface` and NativeWind resolves it unpredictably
  // (this was rendering `bg-charcoal` cards white). Drop the default bg when the
  // caller supplies their own background.
  const hasBg = /(^|\s)bg-/.test(className ?? '');
  return (
    <View
      className={cn('rounded-2xl border border-line p-4', !hasBg && 'bg-surface', className)}
      style={{
        shadowColor: '#202020',
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
      {...rest}
    />
  );
}

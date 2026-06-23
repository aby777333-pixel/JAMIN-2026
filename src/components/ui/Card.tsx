import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

/** Rounded square, hairline border, soft elevation — the §1 card signature. */
export function Card({ className, ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('rounded-2xl border border-line bg-surface p-4', className)}
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

import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '@/lib/cn';
import { formatINR, type MoneyInput } from '@/lib/money';

/**
 * Money is always rendered in JetBrains Mono (tabular) — brand signature (§1).
 * Never format currency with ad-hoc string math; this routes through money.ts.
 */
export function MoneyText({
  value,
  className,
  symbol = true,
  ...rest
}: { value: MoneyInput; symbol?: boolean; className?: string } & TextProps) {
  return (
    <RNText
      className={cn('font-mono text-ink', className)}
      style={{ fontVariant: ['tabular-nums'] }}
      {...rest}>
      {symbol ? formatINR(value) : formatINR(value).replace(/^₹/, '')}
    </RNText>
  );
}

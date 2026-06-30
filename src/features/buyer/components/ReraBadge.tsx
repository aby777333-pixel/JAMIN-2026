import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { color } from '@/theme/tokens';

/**
 * RERA status badge. Registration lives on the project (migration 0047). A
 * 'registered' project whose validity date has passed is shown as expired
 * (computed at read time — no scheduled job needed). 'not_applicable'/unknown
 * renders nothing so the UI stays clean for non-RERA inventory.
 */
export function reraEffectiveStatus(status?: string | null, validTill?: string | null): string | null {
  if (!status || status === 'not_applicable') return null;
  if (status === 'registered' && validTill) {
    const end = new Date(validTill);
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) return 'expired';
  }
  return status;
}

const TONE: Record<string, { box: string; text: string; icon: keyof typeof Ionicons.glyphMap; tint: string; label: string }> = {
  registered: { box: 'border-success/40 bg-success/10', text: 'text-success', icon: 'shield-checkmark', tint: color.success, label: 'RERA verified' },
  pending: { box: 'border-gold/40 bg-gold/10', text: 'text-gold-deep', icon: 'time', tint: color.goldDeep, label: 'RERA pending' },
  expired: { box: 'border-danger/40 bg-danger/10', text: 'text-danger', icon: 'alert-circle', tint: color.red, label: 'RERA expired' },
};

export function ReraBadge({
  status,
  validTill,
  number,
  compact,
}: {
  status?: string | null;
  validTill?: string | null;
  number?: string | null;
  compact?: boolean;
}) {
  const eff = reraEffectiveStatus(status, validTill);
  if (!eff) return null;
  const t = TONE[eff] ?? TONE.pending;
  return (
    <View className={cn('flex-row items-center gap-1 self-start rounded-full border px-2 py-0.5', t.box)}>
      <Ionicons name={t.icon} size={compact ? 11 : 13} color={t.tint} />
      <Text className={cn('font-semibold', compact ? 'text-[10px]' : 'text-[11px]', t.text)}>
        {compact ? 'RERA' : t.label}
        {!compact && number ? ` · ${number}` : ''}
      </Text>
    </View>
  );
}

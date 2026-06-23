import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

const PREFS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'commission', label: 'Commission credited', icon: 'cash' },
  { key: 'withdrawal', label: 'Withdrawal updates', icon: 'wallet' },
  { key: 'lead', label: 'New leads', icon: 'people' },
  { key: 'booking', label: 'Booking updates', icon: 'business' },
  { key: 'kyc', label: 'KYC status', icon: 'id-card' },
  { key: 'badge', label: 'Badges & milestones', icon: 'trophy' },
];

const DEFAULTS: Record<string, boolean> = {
  commission: true,
  withdrawal: true,
  kyc: true,
  lead: true,
  badge: true,
  booking: true,
};

export default function NotificationPrefs() {
  const profile = useAuth((s) => s.profile);
  const refresh = useAuth((s) => s.refreshProfile);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initial = { ...DEFAULTS, ...((profile as any)?.notification_prefs ?? {}) };
  const [prefs, setPrefs] = useState<Record<string, boolean>>(initial);

  async function toggle(key: string) {
    if (!profile) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await supabase
      .from('profiles')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ notification_prefs: next } as any)
      .eq('id', profile.id);
    void refresh();
  }

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Notifications" />
      <Text variant="caption">Choose which alerts you receive in-app and as push notifications.</Text>
      {PREFS.map((p) => {
        const on = prefs[p.key] !== false;
        return (
          <Pressable key={p.key} onPress={() => toggle(p.key)}>
            <Card className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name={p.icon} size={18} color={color.red} />
              </View>
              <Text variant="title" className="flex-1 text-[15px]">
                {p.label}
              </Text>
              <Ionicons
                name={on ? 'toggle' : 'toggle-outline'}
                size={34}
                color={on ? color.success : color.muted}
              />
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

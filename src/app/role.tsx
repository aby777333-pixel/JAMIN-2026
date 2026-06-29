import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useSelectableRoles, useSwitchRole } from '@/features/roles/hooks';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

const DESC: Record<string, string> = {
  buyer: 'Browse & buy properties',
  agent: 'Sales partner toolkit',
  seller: 'List & sell your plots',
  builder: 'List your builds',
  developer: 'List your projects',
  surveyor: 'Offer survey services',
  legal_consultant: 'Offer legal services',
  broker: 'Broker listings & deals',
};

export default function RoleSwitch() {
  const { data: roles = [], isLoading } = useSelectableRoles();
  const current = useAuth((s) => s.profile?.role_slug);
  const refresh = useAuth((s) => s.refreshProfile);
  const sw = useSwitchRole();

  async function pick(slug: string) {
    if (slug === current) return;
    try {
      await sw.mutateAsync(slug);
      await refresh();
      Alert.alert('Role updated', 'Your role has been switched — your tools update right away.');
      router.back();
    } catch (e) {
      Alert.alert('Could not switch', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen contentClassName="pb-12 gap-3">
      <BackHeader title="Switch role" />
      <Text variant="caption">
        Choose how you want to use JAMIN — switch any time, no new account needed. Senior management roles are assigned by an admin.
      </Text>
      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-6" />
      ) : (
        roles.map((r) => (
          <Pressable key={r.id} onPress={() => pick(r.slug)} disabled={sw.isPending}>
            <Card className={`flex-row items-center gap-3 ${r.slug === current ? 'border-red bg-red/5' : ''}`}>
              <View className="flex-1">
                <Text variant="title">{r.name}</Text>
                <Text variant="caption">{DESC[r.slug] ?? ''}</Text>
              </View>
              {r.slug === current ? (
                <Text className="text-[12px] font-bold text-red">CURRENT</Text>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={color.muted} />
              )}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

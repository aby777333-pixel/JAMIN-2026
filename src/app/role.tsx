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
import { errMessage } from '@/lib/errors';

const DESC: Record<string, string> = {
  buyer: 'Browse & buy properties',
  agent: 'Sales partner toolkit',
  broker: 'Broker listings & deals',
  seller: 'List & sell your plots',
};

/** Admin-assigned ranks shown for transparency — never self-selectable. */
const ASSIGNED_ROLES: { name: string; desc: string }[] = [
  { name: 'Sub Promoter', desc: 'Recruit a team & grow your network' },
  { name: 'Promoter', desc: 'Marketing materials, sub-promoters & team analytics' },
  { name: 'Super Admin', desc: 'Full access — sees, knows and controls everything' },
];

export default function RoleSwitch() {
  const { data: roles = [], isLoading } = useSelectableRoles();
  const profile = useAuth((s) => s.profile);
  const current = profile?.role_slug;
  const refresh = useAuth((s) => s.refreshProfile);
  const sw = useSwitchRole();
  // Admin & management ranks (Super Admin … Sub Promoter) are admin-assigned;
  // the server blocks them from self-switching (migration 0094) — this is how
  // an admin account once ended up as a Seller. Mirror that here.
  const isAssignedRank = !!profile && (profile.role_is_admin || (profile.role_level != null && profile.role_level < 6));

  async function pick(slug: string) {
    if (slug === current) return;
    try {
      await sw.mutateAsync(slug);
      await refresh();
      Alert.alert('Role updated', 'Your role has been switched — your tools update right away.');
      router.back();
    } catch (e) {
      Alert.alert('Could not switch', errMessage(e));
    }
  }

  return (
    <Screen contentClassName="pb-12 gap-3">
      <BackHeader title="Switch role" />

      {isAssignedRank ? (
        <Card className="flex-row items-start gap-3 border-gold/50 bg-gold/10">
          <Ionicons name="shield-checkmark" size={20} color={color.goldDeep} style={{ marginTop: 2 }} />
          <View className="flex-1">
            <Text variant="title" className="text-[15px]">Your role is assigned by an admin</Text>
            <Text variant="caption">
              You're signed in with a management rank — switching is disabled here so full access
              can't be lost by accident. Roles are managed in the Admin Portal.
            </Text>
          </View>
        </Card>
      ) : (
        <Text variant="caption">
          Choose how you want to use Jamin Bazaar — switch any time, no new account needed.
        </Text>
      )}

      {!isAssignedRank && current === 'broker' ? (
        <Card className="flex-row items-center gap-3 border-red bg-red/5">
          <View className="flex-1">
            <Text variant="title">Broker</Text>
            <Text variant="caption">
              You're a verified Broker ✓ — switching to another role means re-applying to return.
            </Text>
          </View>
          <Text className="text-[12px] font-bold text-red">CURRENT</Text>
        </Card>
      ) : null}

      {!isAssignedRank ? (
        isLoading ? (
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
        )
      ) : null}

      {/* Broker is apply-first (0097): verified by the Jamin Bazaar team, never instant. */}
      {!isAssignedRank && current !== 'broker' ? (
        <Pressable onPress={() => router.push('/forms/broker')}>
          <Card className="flex-row items-center gap-3 border-gold/40 bg-gold/5">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-gold/15">
              <Ionicons name="ribbon" size={18} color={color.goldDeep} />
            </View>
            <View className="flex-1">
              <Text variant="title">Broker — apply & get verified</Text>
              <Text variant="caption">
                Submit your details and license proof. The Jamin Bazaar team verifies and upgrades you to a
                verified Broker.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={color.muted} />
          </Card>
        </Pressable>
      ) : null}

      <Text variant="label" className="mt-2">
        Assigned by admin
      </Text>
      {ASSIGNED_ROLES.map((r) => (
        <Card key={r.name} className="flex-row items-center gap-3 opacity-80">
          <View className="flex-1">
            <Text variant="title">{r.name}</Text>
            <Text variant="caption">{r.desc}</Text>
          </View>
          <Ionicons name="lock-closed" size={16} color={color.muted} />
        </Card>
      ))}
      <Text variant="caption" className="text-muted">
        Want to become a Promoter or Sub Promoter? Apply from Account → Become a partner — the Jamin Bazaar
        team reviews and assigns it.
      </Text>
    </Screen>
  );
}

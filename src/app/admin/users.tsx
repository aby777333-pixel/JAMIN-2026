import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { useRolesList, useSetKyc, useSetUserRole, useUsers } from '@/features/admin/hooks';
import { color } from '@/theme/tokens';

export default function AdminUsers() {
  const { data: users = [], isLoading } = useUsers();
  const { data: roles = [] } = useRolesList();
  const setRole = useSetUserRole();
  const setKyc = useSetKyc();

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Users & roles" />
      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : (
        users.map((u) => (
          <Card key={u.id} className="gap-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text variant="title" numberOfLines={1}>
                  {u.full_name ?? 'New member'}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {u.email ?? '—'}
                </Text>
              </View>
              <StatusPill status={u.kyc_status} />
            </View>

            <View className="gap-1.5">
              <Text variant="label">Role</Text>
              <View className="flex-row flex-wrap gap-2">
                {roles.map((r) => (
                  <Chip
                    key={r.id}
                    label={r.name}
                    active={u.role?.slug === r.slug}
                    onPress={() => setRole.mutate({ userId: u.id, roleId: r.id })}
                  />
                ))}
              </View>
            </View>

            {u.kyc_status === 'pending' ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    title="Approve KYC"
                    variant="secondary"
                    onPress={() => setKyc.mutate({ userId: u.id, status: 'verified' })}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title="Reject"
                    variant="outline"
                    onPress={() => setKyc.mutate({ userId: u.id, status: 'rejected' })}
                  />
                </View>
              </View>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAdminStats } from '@/features/admin/hooks';
import { color } from '@/theme/tokens';

export default function AdminDashboard() {
  const { data: s } = useAdminStats();

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="Admin Portal" />

      <View className="flex-row gap-3">
        <StatCard label="Users" icon="people">
          <Text className="font-mono-bold text-[20px] text-ink">{s?.users ?? '—'}</Text>
        </StatCard>
        <StatCard label="Available" icon="business">
          <Text className="font-mono-bold text-[20px] text-ink">{s?.available ?? '—'}</Text>
        </StatCard>
        <StatCard label="Sold" icon="checkmark-done">
          <Text className="font-mono-bold text-[20px] text-ink">{s?.sold ?? '—'}</Text>
        </StatCard>
      </View>
      <View className="flex-row gap-3">
        <StatCard label="Pending KYC" icon="id-card">
          <Text className="font-mono-bold text-[20px] text-ink">{s?.pendingKyc ?? '—'}</Text>
        </StatCard>
        <StatCard label="Payouts" icon="wallet">
          <Text className="font-mono-bold text-[20px] text-ink">{s?.pendingWithdrawals ?? '—'}</Text>
        </StatCard>
        <StatCard label="Leads" icon="flame">
          <Text className="font-mono-bold text-[20px] text-ink">{s?.leads ?? '—'}</Text>
        </StatCard>
      </View>

      <Text variant="label" className="mt-2">
        Manage
      </Text>
      <View className="gap-3">
        <Tile icon="construct" title="Form Builder" sub="Edit any form — unlimited fields" onPress={() => router.push('/admin/forms')} />
        <Tile icon="file-tray-full" title="Submissions" sub="Applications & enquiries to review" onPress={() => router.push('/admin/submissions')} />
        <Tile icon="people-circle" title="Users & roles" sub="Promote, verify KYC" onPress={() => router.push('/admin/users')} />
        <Tile icon="checkmark-circle" title="Approvals" sub="Payouts & close sales" onPress={() => router.push('/admin/approvals')} />
        <Tile icon="cash" title="Commission rules" sub="Toggle & inspect" onPress={() => router.push('/admin/rules')} />
        <Tile icon="bar-chart" title="Analytics" sub="Performance & audit log" onPress={() => router.push('/admin/analytics')} />
      </View>
    </Screen>
  );
}

function Tile({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-red/10">
        <Ionicons name={icon} size={22} color={color.red} />
      </View>
      <View className="flex-1">
        <Text variant="title">{title}</Text>
        <Text variant="caption">{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={color.muted} />
    </Pressable>
  );
}

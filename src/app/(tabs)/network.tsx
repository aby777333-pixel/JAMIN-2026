import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BG } from '@/components/brand/backgrounds';
import { ImageBackdrop } from '@/components/brand/ImageBackdrop';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { Text } from '@/components/ui/Text';
import { useDownline, useTeamSummary, useTerritoryName } from '@/features/team/hooks';
import type { TeamMember } from '@/features/team/api';
import { formatINR } from '@/lib/money';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

export default function Network() {
  const insets = useSafeAreaInsets();
  const profile = useAuth((s) => s.profile);
  const { data: team = [], isLoading, refetch, isRefetching } = useDownline();
  const { data: summary } = useTeamSummary();
  const { data: territory } = useTerritoryName(profile?.territory_id);

  const direct = team.filter((m) => m.parent_id === profile?.id).length;
  const sorted = [...team].sort((a, b) => (a.role?.level ?? 99) - (b.role?.level ?? 99));

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <ImageBackdrop source={BG.network} />
      <FlatList
        data={sorted}
        keyExtractor={(m) => m.id}
        contentContainerClassName="px-5 pb-8 gap-3"
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={
          <View className="gap-3 pb-1 pt-2">
            <View className="flex-row items-center justify-between">
              <Text variant="h1">Network</Text>
              {territory ? (
                <View className="flex-row items-center gap-1 rounded-full bg-gold/15 px-3 py-1.5">
                  <Ionicons name="map" size={13} color={color.goldDeep} />
                  <Text className="text-[12px] font-semibold text-gold-deep">{territory}</Text>
                </View>
              ) : null}
            </View>
            <View className="flex-row gap-3">
              <StatCard label="Team size" icon="people">
                <Text className="font-mono-bold text-[22px] text-ink">{team.length}</Text>
              </StatCard>
              <StatCard label="Direct" icon="git-branch">
                <Text className="font-mono-bold text-[22px] text-ink">{direct}</Text>
              </StatCard>
            </View>
            <View className="flex-row gap-3">
              <StatCard label="Team sales" icon="trending-up">
                <Text className="font-mono-bold text-[22px] text-ink">{summary?.team_sales ?? 0}</Text>
              </StatCard>
              <StatCard label="Team revenue" icon="cash">
                <Text className="font-mono-bold text-[18px] text-ink">
                  {formatINR(summary?.team_revenue ?? 0)}
                </Text>
              </StatCard>
            </View>

            <Card className="bg-charcoal gap-2">
              <Text className="font-medium text-[12px] uppercase tracking-[2px] text-gold">
                Recruit your team
              </Text>
              <Text className="text-[13px] text-white/70">
                Share your invite — every signup binds under you automatically.
              </Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="font-mono-bold text-[20px] text-white tracking-[2px]">
                  {profile?.referral_code ?? '—'}
                </Text>
              </View>
              <Button
                title="Recruit & invite"
                variant="secondary"
                onPress={() => router.push('/recruit')}
              />
            </Card>

            <Card className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-gold/15">
                <Ionicons name="funnel" size={20} color={color.goldDeep} />
              </View>
              <View className="flex-1">
                <Text variant="title">Referral Engine</Text>
                <Text variant="caption">Funnel, campaigns & fraud signals</Text>
              </View>
              <Button title="Open" variant="outline" onPress={() => router.push('/referrals')} />
            </Card>

            <Card className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-red/10">
                <Ionicons name="gift" size={20} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title">Incentives & bonuses</Text>
                <Text variant="caption">Bonus structures & claimable rewards</Text>
              </View>
              <Button title="Open" variant="outline" onPress={() => router.push('/incentives')} />
            </Card>

            {team.length > 0 ? (
              <Text variant="label" className="mt-1">
                Your team
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <TeamMemberRow member={item} />}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={color.red} />
            </View>
          ) : (
            <EmptyState
              icon="people"
              title="No team yet"
              body="Share your invite to start building your network. New members appear here instantly."
            />
          )
        }
      />
    </View>
  );
}

function TeamMemberRow({ member }: { member: TeamMember }) {
  const initials = (member.full_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <Pressable onPress={() => router.push(`/team/${member.id}`)}>
      <Card className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-red/10">
          <Text className="font-bold text-red">{initials}</Text>
        </View>
        <View className="flex-1">
          <Text variant="title" numberOfLines={1}>
            {member.full_name ?? 'New member'}
          </Text>
          <Text variant="caption">Ref {member.referral_code}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={color.muted} />
      </Card>
    </Pressable>
  );
}

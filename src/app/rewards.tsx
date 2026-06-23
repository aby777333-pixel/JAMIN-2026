import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useBadges, useLeaderboard, useMyBadges, type LeaderMetric } from '@/features/gamification/api';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

const TIER_COLOR: Record<string, string> = {
  bronze: '#C8911E',
  silver: '#9AA0A6',
  gold: '#FBBC15',
};

const METRICS: { key: LeaderMetric; label: string }[] = [
  { key: 'earnings', label: 'Earnings' },
  { key: 'sales', label: 'Sales' },
  { key: 'team', label: 'Team' },
  { key: 'referrals', label: 'Referrals' },
];

export default function Rewards() {
  const meId = useAuth((s) => s.profile?.id);
  const { data: badges = [] } = useBadges();
  const { data: mine } = useMyBadges();
  const [metric, setMetric] = useState<LeaderMetric>('earnings');
  const { data: board = [], isLoading } = useLeaderboard(metric);

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="Rewards" />

      <Text variant="label">Your badges</Text>
      <View className="flex-row flex-wrap gap-3">
        {badges.map((b) => {
          const earned = mine?.has(b.id) ?? false;
          const tint = TIER_COLOR[b.tier] ?? color.gold;
          return (
            <Card key={b.id} className={`w-[47%] flex-grow items-center gap-1 ${earned ? '' : 'opacity-50'}`}>
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${tint}22` }}>
                <Ionicons name={(b.icon as keyof typeof Ionicons.glyphMap) ?? 'ribbon'} size={24} color={tint} />
              </View>
              <Text variant="title" className="text-center text-[13px]">
                {b.name}
              </Text>
              <Text variant="caption" className="text-center">
                {earned ? 'Unlocked' : b.description}
              </Text>
            </Card>
          );
        })}
      </View>

      <Text variant="label" className="mt-2">
        Leaderboard
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {METRICS.map((m) => (
          <Chip key={m.key} label={m.label} active={metric === m.key} onPress={() => setMetric(m.key)} />
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={color.red} />
      ) : board.length === 0 ? (
        <Card>
          <Text variant="body" className="text-muted">
            No ranked members yet. Close deals and grow your team to climb.
          </Text>
        </Card>
      ) : (
        <View className="gap-2">
          {board.map((row) => {
            const isMe = row.user_id === meId;
            return (
              <Card key={row.user_id} className={`flex-row items-center gap-3 ${isMe ? 'border-red/40 bg-red/5' : ''}`}>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-ink/10">
                  <Text className="font-mono-bold text-[13px] text-ink">{row.rank}</Text>
                </View>
                <View className="flex-1">
                  <Text variant="title" numberOfLines={1} className="text-[14px]">
                    {row.full_name ?? 'Member'} {isMe ? '(you)' : ''}
                  </Text>
                  <Text variant="caption">{row.role_name ?? ''}</Text>
                </View>
                {metric === 'earnings' ? (
                  <MoneyText value={row.value} className="text-[14px]" />
                ) : (
                  <Text className="font-mono-bold text-[15px] text-ink">{row.value}</Text>
                )}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

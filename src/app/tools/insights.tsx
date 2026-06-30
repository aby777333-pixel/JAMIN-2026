import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import {
  useInvestmentHotspots,
  useMarketTrends,
  useSeasonLeaderboard,
  type Season,
} from '@/features/insights/hooks';
import { color } from '@/theme/tokens';

/** Market insights — locality trends, investment hotspots, seasonal leaderboard. */
export default function Insights() {
  const { data: trends = [], isLoading: lt } = useMarketTrends();
  const { data: spots = [], isLoading: ls } = useInvestmentHotspots();
  const [season, setSeason] = useState<Season>('month');
  const { data: board = [], isLoading: lb } = useSeasonLeaderboard(season);

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="Market insights" />

      <Text variant="label">Investment hotspots</Text>
      <Text variant="caption">Localities where buyer demand outstrips available supply.</Text>
      {ls ? (
        <ActivityIndicator color={color.red} />
      ) : spots.length === 0 ? (
        <Card><Text variant="caption">Not enough data yet.</Text></Card>
      ) : (
        <Card className="gap-2">
          {spots.slice(0, 12).map((s) => (
            <View key={s.location} className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text variant="title" className="text-[14px]" numberOfLines={1}>{s.location}</Text>
                <Text variant="caption">{s.demand} seeking · {s.supply} available</Text>
              </View>
              <View className="items-end">
                <Text className="font-mono-bold text-[14px] text-gold-deep">{s.score.toFixed(2)}</Text>
                {s.avg_price ? <MoneyText value={String(s.avg_price)} className="text-[11px] text-muted" /> : null}
              </View>
            </View>
          ))}
        </Card>
      )}

      <Text variant="label" className="mt-2">Locality price trends</Text>
      {lt ? (
        <ActivityIndicator color={color.red} />
      ) : trends.length === 0 ? (
        <Card><Text variant="caption">No listings yet.</Text></Card>
      ) : (
        <Card className="gap-2">
          {trends.slice(0, 12).map((t) => (
            <View key={t.location} className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text variant="title" className="text-[14px]" numberOfLines={1}>{t.location}</Text>
                <Text variant="caption">{t.available} available · {t.sold} sold</Text>
              </View>
              <MoneyText value={String(t.avg_price)} className="text-[13px]" />
            </View>
          ))}
        </Card>
      )}

      <Text variant="label" className="mt-2">Leaderboard</Text>
      <View className="flex-row gap-2">
        <Chip label="This month" active={season === 'month'} onPress={() => setSeason('month')} />
        <Chip label="Last month" active={season === 'last_month'} onPress={() => setSeason('last_month')} />
        <Chip label="All-time" active={season === 'all'} onPress={() => setSeason('all')} />
      </View>
      {lb ? (
        <ActivityIndicator color={color.red} />
      ) : board.length === 0 ? (
        <Card><Text variant="caption">No earnings in this period.</Text></Card>
      ) : (
        <Card className="gap-2">
          {board.slice(0, 10).map((r) => (
            <View key={r.user_id} className="flex-row items-center gap-3">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-ink/10">
                <Text className="font-mono-bold text-[12px] text-ink">{r.rank}</Text>
              </View>
              <View className="flex-1">
                <Text variant="title" className="text-[14px]" numberOfLines={1}>{r.full_name ?? 'Member'}</Text>
                <Text variant="caption">{r.role_name ?? ''}</Text>
              </View>
              <MoneyText value={String(r.earnings)} className="text-[13px]" />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { type CobrokeListing } from '@/features/cobroke/api';
import {
  useCobrokeInterests,
  useExpressInterest,
  useMyCobroke,
  useOpenCobroke,
  useRespondInterest,
} from '@/features/cobroke/hooks';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/** Co-broking marketplace — agents share inventory and split commission. */
export default function Cobroke() {
  const profile = useAuth((s) => s.profile);
  const [tab, setTab] = useState<'open' | 'mine'>('open');
  const { data: open = [], isLoading: lo } = useOpenCobroke();
  const { data: mine = [], isLoading: lm } = useMyCobroke();
  const express = useExpressInterest();

  if (!can(profile, 'sell')) {
    return (
      <Screen>
        <BackHeader title="Co-broking" />
        <Text variant="body" className="mt-8 text-center text-muted">Co-broking is for agents and partners.</Text>
      </Screen>
    );
  }

  function interested(l: CobrokeListing) {
    express
      .mutateAsync({ listingId: l.id })
      .then(() => Alert.alert('Interest sent', 'The posting agent has been notified.'))
      .catch((e) => Alert.alert('Could not send', errMessage(e)));
  }

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Co-broking" />
      <View className="flex-row gap-2">
        <Button title="Open offers" variant={tab === 'open' ? 'primary' : 'outline'} className="flex-1 h-11" onPress={() => setTab('open')} />
        <Button title="My posts" variant={tab === 'mine' ? 'primary' : 'outline'} className="flex-1 h-11" onPress={() => setTab('mine')} />
      </View>

      {tab === 'open' ? (
        lo ? (
          <ActivityIndicator color={color.red} />
        ) : open.length === 0 ? (
          <EmptyState icon="git-network" title="No open offers" body="When agents post listings to co-broke, they appear here." />
        ) : (
          open.map((l) => (
            <Card key={l.id} className="gap-2">
              <Pressable onPress={() => router.push(`/property/${l.property_id}`)}>
                <Text variant="title" className="text-[14px]" numberOfLines={1}>
                  {l.property?.project?.name ?? ''} · {l.property?.plot_code}
                </Text>
              </Pressable>
              <View className="flex-row items-center justify-between">
                {l.property ? <MoneyText value={l.property.price} className="text-[14px]" /> : <View />}
                <Text variant="caption" className="text-gold-deep">Split {l.split_pct}%</Text>
              </View>
              {l.note ? <Text variant="caption">{l.note}</Text> : null}
              <Text variant="caption">by {l.poster?.full_name ?? 'Agent'}</Text>
              <Button title="I'm interested" variant="outline" loading={express.isPending} onPress={() => interested(l)} className="h-10" />
            </Card>
          ))
        )
      ) : lm ? (
        <ActivityIndicator color={color.red} />
      ) : mine.length === 0 ? (
        <EmptyState icon="megaphone" title="No co-broke posts" body="Open any of your listings and tap “Offer for co-broking”." />
      ) : (
        mine.map((l) => <MyPostCard key={l.id} listing={l} />)
      )}
    </Screen>
  );
}

function MyPostCard({ listing }: { listing: CobrokeListing }) {
  const { data: interests = [] } = useCobrokeInterests(listing.id);
  const respond = useRespondInterest(listing.id);
  return (
    <Card className="gap-2">
      <Text variant="title" className="text-[14px]" numberOfLines={1}>
        {listing.property?.project?.name ?? ''} · {listing.property?.plot_code}
      </Text>
      <View className="flex-row items-center justify-between">
        <Text variant="caption" className="text-gold-deep">Split {listing.split_pct}%</Text>
        <Text variant="caption" className="capitalize">{listing.status}</Text>
      </View>
      {interests.length === 0 ? (
        <Text variant="caption">No interest yet.</Text>
      ) : (
        interests.map((i) => (
          <View key={i.id} className="rounded-xl bg-paper p-2.5">
            <View className="flex-row items-center justify-between">
              <Text variant="title" className="text-[13px]">{i.agent?.full_name ?? 'Agent'}</Text>
              <Text variant="caption" className="capitalize">{i.status}</Text>
            </View>
            {i.message ? <Text variant="caption">{i.message}</Text> : null}
            {i.status === 'pending' ? (
              <View className="mt-2 flex-row gap-2">
                <Button title="Accept" variant="secondary" className="h-9 flex-1" onPress={() => respond.mutate({ interestId: i.id, decision: 'accepted' })} />
                <Button title="Decline" variant="ghost" className="h-9 flex-1" onPress={() => respond.mutate({ interestId: i.id, decision: 'declined' })} />
              </View>
            ) : i.status === 'accepted' && i.agent?.phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${i.agent?.phone}`)} className="mt-1 flex-row items-center gap-1">
                <Ionicons name="call" size={14} color={color.red} />
                <Text className="text-[13px] text-red">{i.agent.phone}</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </Card>
  );
}

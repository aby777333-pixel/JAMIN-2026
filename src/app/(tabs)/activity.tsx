import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAnnouncements } from '@/features/content/hooks';
import { useAgentDigest } from '@/features/leads/hooks';
import { useMarkRead, useNotifications } from '@/features/notifications/api';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { category } from '@/theme/tokens';

/**
 * Activity — one job: "what's new and what needs me". Announcements (from the
 * old Home), the partner day-digest, agenda/enquiry entry points and the most
 * recent notifications. The full feed with mark-all stays at /notifications.
 */
export default function Activity() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const isPartner = !!profile?.role_slug && profile.role_slug !== 'buyer';
  const canSell = can(profile, 'sell');

  const { data: digest } = useAgentDigest(isPartner);
  const { data: announcements = [] } = useAnnouncements();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();

  const visibleAnn = announcements.filter(
    (a) => a.audience === 'all' || a.audience === (isPartner ? 'partner' : 'buyer'),
  );
  const recent = notifications.slice(0, 8);

  function openCta(url: string | null) {
    if (!url) return;
    if (/^(https?:|mailto:|tel:|whatsapp:)/.test(url)) void Linking.openURL(url);
    else router.push(url as never);
  }

  return (
    <Screen contentClassName="pt-4 gap-3">
      <Text variant="h1">Activity</Text>
      <Text variant="caption">Updates, appointments and things that need you.</Text>

      {/* Partner day digest — the one number block that earns its place. */}
      {canSell && digest && digest.followupsDue + digest.staleLeads + digest.newToday > 0 ? (
        <Pressable onPress={() => router.push('/leads')}>
          <Card className="gap-2">
            <Text variant="label">Today</Text>
            <View className="flex-row justify-between">
              {[
                { n: digest.followupsDue, label: 'follow-ups due' },
                { n: digest.staleLeads, label: 'waiting 24h+' },
                { n: digest.newToday, label: 'new leads' },
              ].map((s) => (
                <View key={s.label} className="flex-1 items-center">
                  <Text className="font-mono-bold text-[20px] text-ink">{s.n}</Text>
                  <Text variant="caption">{s.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        </Pressable>
      ) : null}

      {!isPartner ? (
        <ListRow
          icon="grid-outline"
          accent={category.buy}
          label={t('activity.buyerHub', { defaultValue: 'My dashboard' })}
          sub={t('activity.buyerHubSub', { defaultValue: 'Everything about your search in one place' })}
          onPress={() => router.push('/buyer-hub')}
        />
      ) : null}
      <ListRow
        icon="calendar"
        accent={category.comms}
        label={canSell ? 'My agenda' : 'My site visits'}
        sub={canSell ? 'Visits and follow-ups in one view' : 'Bookings and check-in'}
        onPress={() => router.push(canSell ? '/agenda' : '/visits')}
      />
      <ListRow
        icon="pricetag"
        accent={category.finance}
        label="My enquiries & offers"
        sub="Every conversation goes through JAMIN"
        onPress={() => router.push('/offers')}
      />
      {canSell ? (
        <ListRow
          icon="people"
          accent={category.sell}
          label="Leads"
          sub="Your pipeline, follow-ups and status"
          onPress={() => router.push('/leads')}
        />
      ) : null}

      {visibleAnn.length > 0 ? (
        <View className="gap-2 pt-1">
          <Text variant="label">From JAMIN</Text>
          {visibleAnn.map((a) => (
            <Pressable key={a.id} disabled={!a.cta_url} onPress={() => openCta(a.cta_url)}>
              <Card className="gap-1">
                {a.image_url ? (
                  <Image
                    source={{ uri: a.image_url }}
                    style={{ width: '100%', height: 130, borderRadius: 10, marginBottom: 4 }}
                    contentFit="cover"
                  />
                ) : null}
                <Text variant="title" className="text-[15px]">
                  {a.title}
                </Text>
                {a.body ? <Text variant="caption">{a.body}</Text> : null}
                {a.cta_label && a.cta_url ? (
                  <Text className="mt-1 font-semibold text-[13px] text-red">{a.cta_label}</Text>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center justify-between pt-1">
        <Text variant="label">Recent updates</Text>
        <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
          <Text className="font-semibold text-[13px] text-red">View all</Text>
        </Pressable>
      </View>
      {recent.length === 0 ? (
        <Card>
          <Text variant="body" className="text-muted">
            You're all caught up. New activity appears here.
          </Text>
        </Card>
      ) : (
        recent.map((n) => {
          const unread = !n.read_at;
          return (
            <Pressable
              key={n.id}
              onPress={() => {
                if (unread) markRead.mutate(n.id);
                router.push('/notifications');
              }}>
              <Card className="flex-row items-start gap-3 py-3">
                <View className="min-w-0 flex-1">
                  <Text variant="title" className="text-[14px]" numberOfLines={1}>
                    {n.title}
                  </Text>
                  {n.body ? (
                    <Text variant="caption" numberOfLines={2}>
                      {n.body}
                    </Text>
                  ) : null}
                  <Text variant="caption" className="mt-0.5 text-[11px]">
                    {new Date(n.created_at).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                {unread ? <View className="mt-1.5 h-2.5 w-2.5 rounded-full bg-red" /> : null}
              </Card>
            </Pressable>
          );
        })
      )}
      <View className="h-2" />
    </Screen>
  );
}

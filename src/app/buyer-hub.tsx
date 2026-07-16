import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { PropertyCard } from '@/features/buyer/components/PropertyCard';
import {
  useMyBrochureDownloads,
  useMyCompareEvents,
  useMyNotesCount,
  useSavedSearches,
} from '@/features/buyer/enhancements';
import {
  useRecentlyViewed,
  useRecommended,
  useToggleWishlist,
  useWishlistIds,
} from '@/features/buyer/hooks';
import { useNotifications } from '@/features/notifications/api';
import { useMyVisits } from '@/features/visits/hooks';
import { color } from '@/theme/tokens';

const inr = (v: number) => `₹${Number(v).toLocaleString('en-IN')}`;

/** Section header: label on the left, a "View all" style link on the right. */
function SectionHead({ label, linkLabel, onPress }: { label: string; linkLabel: string; onPress: () => void }) {
  return (
    <View className="flex-row items-center justify-between pt-1">
      <Text variant="label">{label}</Text>
      <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
        <Text className="font-semibold text-[13px] text-red">{linkLabel}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Buyer hub — "My dashboard": everything about the buyer's search in one
 * place. Each section only renders when it has data; pure aggregation, no
 * new writes here.
 */
export default function BuyerHub() {
  const { t } = useTranslation();

  const { data: recent = [] } = useRecentlyViewed(6);
  const { data: saved } = useWishlistIds();
  const toggle = useToggleWishlist();
  const { data: visits = [] } = useMyVisits();
  const { data: brochures = [] } = useMyBrochureDownloads(5);
  const { data: searches = [] } = useSavedSearches();
  const { data: compares = [] } = useMyCompareEvents(10);
  const { data: notesCount = 0 } = useMyNotesCount();
  const { data: notifications = [] } = useNotifications();
  const { data: recommended = [] } = useRecommended(6);

  const savedCount = saved?.size ?? 0;
  const now = Date.now();
  const upcoming = visits
    .filter(
      (v) =>
        new Date(v.scheduled_at).getTime() >= now &&
        v.status !== 'cancelled' &&
        v.status !== 'no_show' &&
        v.status !== 'completed',
    )
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 3);
  const recentNotifications = notifications.slice(0, 5);
  const viewAll = t('buyerHub.viewAll', { defaultValue: 'View all' });

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title={t('buyerHub.title', { defaultValue: 'My dashboard' })} />
      <Text variant="caption">
        {t('buyerHub.subtitle', { defaultValue: 'Everything about your property search in one place.' })}
      </Text>

      {/* Recently viewed — compact rows so the dashboard stays scannable. */}
      {recent.length > 0 ? (
        <>
          <SectionHead
            label={t('buyerHub.recentlyViewed', { defaultValue: 'Recently viewed' })}
            linkLabel={viewAll}
            onPress={() => router.push('/recent')}
          />
          {recent.slice(0, 4).map((item) => (
            <Pressable key={item.id} onPress={() => router.push(`/property/${item.id}`)}>
              <Card className="flex-row items-center gap-3 py-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl border border-line bg-paper">
                  <Ionicons name="home-outline" size={18} color={color.ink} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text variant="title" className="text-[14px]" numberOfLines={1}>
                    {item.plot_code}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {[item.project?.name, item.project?.location].filter(Boolean).join(' · ') ||
                      t('buyerHub.property', { defaultValue: 'Property' })}
                  </Text>
                </View>
                <Text className="font-mono-bold text-[13px] text-ink">{inr(item.price)}</Text>
              </Card>
            </Pressable>
          ))}
        </>
      ) : null}

      {/* Shortcuts — saved hearts, shortlists, saved searches, comparisons, notes. */}
      <Text variant="label" className="pt-1">
        {t('buyerHub.myCollections', { defaultValue: 'My collections' })}
      </Text>
      <ListRow
        icon="heart"
        label={t('buyerHub.savedProps', { defaultValue: 'Saved properties' })}
        sub={
          savedCount > 0
            ? t('buyerHub.savedPropsCount', { defaultValue: '{{count}} saved with the heart', count: savedCount })
            : t('buyerHub.savedPropsHint', { defaultValue: 'Tap the heart on any listing to save it' })
        }
        onPress={() => router.push('/recent')}
      />
      <ListRow
        icon="albums-outline"
        label={t('buyerHub.shortlists', { defaultValue: 'Shortlists' })}
        sub={t('buyerHub.shortlistsSub', { defaultValue: 'Group plots and share with family' })}
        onPress={() => router.push('/shortlists')}
      />
      <ListRow
        icon="bookmark-outline"
        label={t('buyerHub.savedSearches', { defaultValue: 'Saved searches' })}
        sub={t('buyerHub.savedSearchesCount', { defaultValue: '{{count}} saved', count: searches.length })}
        onPress={() => router.push('/saved-searches')}
      />
      {compares.length > 0 ? (
        <ListRow
          icon="git-compare"
          label={t('buyerHub.comparisons', { defaultValue: 'Recent comparisons' })}
          sub={t('buyerHub.comparisonsCount', { defaultValue: '{{count}} comparisons made', count: compares.length })}
          onPress={() => router.push('/compare')}
        />
      ) : null}
      {notesCount > 0 ? (
        <ListRow
          icon="create-outline"
          label={t('buyerHub.notes', { defaultValue: 'My notes' })}
          sub={t('buyerHub.notesCount', { defaultValue: 'Notes on {{count}} properties', count: notesCount })}
          onPress={() => router.push('/recent')}
        />
      ) : null}

      {/* Upcoming site visits. */}
      {upcoming.length > 0 ? (
        <>
          <SectionHead
            label={t('buyerHub.upcomingVisits', { defaultValue: 'Upcoming site visits' })}
            linkLabel={viewAll}
            onPress={() => router.push('/visits')}
          />
          {upcoming.map((v) => (
            <Pressable key={v.id} onPress={() => router.push('/visits')}>
              <Card className="flex-row items-center gap-3 py-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl border border-line bg-paper">
                  <Ionicons name="calendar" size={18} color={color.ink} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text variant="title" className="text-[14px]" numberOfLines={1}>
                    {v.property?.plot_code ?? t('buyerHub.siteVisit', { defaultValue: 'Site visit' })}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {new Date(v.scheduled_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {v.property?.project?.name ? ` · ${v.property.project.name}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={color.muted} />
              </Card>
            </Pressable>
          ))}
        </>
      ) : null}

      {/* Brochures downloaded. */}
      {brochures.length > 0 ? (
        <>
          <SectionHead
            label={t('buyerHub.brochures', { defaultValue: 'Brochure downloads' })}
            linkLabel={viewAll}
            onPress={() => router.push('/brochures')}
          />
          <Card className="gap-2.5">
            {brochures.map((b) => (
              <Pressable
                key={b.id}
                onPress={() =>
                  b.property_id ? router.push(`/property/${b.property_id}`) : router.push('/brochures')
                }
                className="flex-row items-center gap-2.5">
                <Ionicons name="document-text-outline" size={16} color={color.muted} />
                <View className="min-w-0 flex-1">
                  <Text className="font-medium text-[13px] text-ink" numberOfLines={1}>
                    {b.title}
                    {b.property?.plot_code ? ` · ${b.property.plot_code}` : ''}
                  </Text>
                </View>
                <Text variant="caption" className="text-[11px]">
                  {new Date(b.created_at).toLocaleDateString('en-IN')}
                </Text>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      {/* Notifications preview. */}
      {recentNotifications.length > 0 ? (
        <>
          <SectionHead
            label={t('buyerHub.updates', { defaultValue: 'Latest updates' })}
            linkLabel={viewAll}
            onPress={() => router.push('/notifications')}
          />
          <Card className="gap-2.5">
            {recentNotifications.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => router.push('/notifications')}
                className="flex-row items-start gap-2.5">
                <View
                  className="mt-1.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: n.read_at ? color.line : color.red }}
                />
                <View className="min-w-0 flex-1">
                  <Text className="font-medium text-[13px] text-ink" numberOfLines={1}>
                    {n.title}
                  </Text>
                  {n.body ? (
                    <Text variant="caption" numberOfLines={1}>
                      {n.body}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      {/* Recommended for you. */}
      {recommended.length > 0 ? (
        <>
          <SectionHead
            label={t('buyerHub.recommended', { defaultValue: 'Recommended for you' })}
            linkLabel={t('buyerHub.browse', { defaultValue: 'Browse' })}
            onPress={() => router.push('/(tabs)/properties')}
          />
          {recommended.map((item) => (
            <PropertyCard
              key={item.id}
              item={item}
              saved={saved?.has(item.id) ?? false}
              onToggleSave={() =>
                toggle.mutate({ propertyId: item.id, saved: saved?.has(item.id) ?? false })
              }
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

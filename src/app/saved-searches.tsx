import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import {
  useDeleteSavedSearch,
  useSavedSearches,
  useToggleSavedSearchNotify,
} from '@/features/buyer/enhancements';
import { errMessage } from '@/lib/errors';
import { useSearchStore } from '@/stores/search';
import { color } from '@/theme/tokens';

const inr = (v: number) => `₹${Number(v).toLocaleString('en-IN')}`;

/** Human one-liner for a stored filters doc — best-effort over known keys. */
function summarize(filters: Record<string, unknown>, fallback: string): string {
  const parts: string[] = [];
  if (typeof filters.search === 'string' && filters.search.trim()) parts.push(`“${filters.search.trim()}”`);
  const min = typeof filters.priceMin === 'number' ? filters.priceMin : null;
  const max = typeof filters.priceMax === 'number' ? filters.priceMax : null;
  if (min != null || max != null) {
    parts.push(`${min != null ? inr(min) : '₹0'} – ${max != null ? inr(max) : 'any'}`);
  }
  if (typeof filters.facing === 'string' && filters.facing) parts.push(String(filters.facing));
  if (typeof filters.possession === 'string' && filters.possession) parts.push(String(filters.possession).replace(/_/g, ' '));
  if (typeof filters.saleType === 'string' && filters.saleType) parts.push(String(filters.saleType));
  if (filters.verifiedOnly === true) parts.push('Verified');
  if (filters.premiumOnly === true) parts.push('Premium');
  if (filters.savedOnly === true) parts.push('Saved only');
  if (typeof filters.sort === 'string' && filters.sort && filters.sort !== 'plot') parts.push(String(filters.sort).replace(/_/g, ' '));
  return parts.length ? parts.join(' · ') : fallback;
}

/**
 * Saved searches (migration 0100) — every saved filter set with a notify bell,
 * Apply (parks the filters and opens the Properties tab) and Delete.
 */
export default function SavedSearches() {
  const { t } = useTranslation();
  const { data: searches = [], isLoading } = useSavedSearches();
  const del = useDeleteSavedSearch();
  const toggleNotify = useToggleSavedSearchNotify();
  const setPendingFilters = useSearchStore((s) => s.setPendingFilters);

  function apply(filters: Record<string, unknown>) {
    setPendingFilters(filters);
    router.push('/(tabs)/properties');
  }

  function remove(id: string) {
    del.mutate(id, {
      onError: (e) =>
        Alert.alert(t('savedSearches.deleteFailed', { defaultValue: 'Could not delete' }), errMessage(e)),
    });
  }

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title={t('savedSearches.title', { defaultValue: 'Saved searches' })} />
      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-8" />
      ) : searches.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title={t('savedSearches.emptyTitle', { defaultValue: 'No saved searches yet' })}
          body={t('savedSearches.emptyBody', {
            defaultValue:
              'Set your filters on the Properties screen and tap “Save search” in the filter bar — we’ll keep it here and can alert you about new matches.',
          })}
        />
      ) : (
        searches.map((s) => (
          <Card key={s.id} className="gap-2.5">
            <View className="flex-row items-center gap-3">
              <View className="min-w-0 flex-1">
                <Text variant="title" className="text-[15px]" numberOfLines={1}>
                  {s.name}
                </Text>
                <Text variant="caption" numberOfLines={2}>
                  {summarize(s.filters ?? {}, t('savedSearches.allProperties', { defaultValue: 'All properties' }))}
                </Text>
              </View>
              <Pressable
                onPress={() => toggleNotify.mutate({ id: s.id, notify: !s.notify })}
                hitSlop={10}
                accessibilityRole="button"
                className="h-9 w-9 items-center justify-center rounded-full bg-paper">
                <Ionicons
                  name={s.notify ? 'notifications' : 'notifications-off-outline'}
                  size={17}
                  color={s.notify ? color.red : color.muted}
                />
              </Pressable>
            </View>
            <View className="flex-row flex-wrap items-center gap-2">
              <Pressable
                onPress={() => apply(s.filters ?? {})}
                accessibilityRole="button"
                className="flex-row items-center gap-1.5 rounded-full bg-red px-4 py-2">
                <Ionicons name="search" size={14} color="#FFFFFF" />
                <Text className="font-semibold text-[13px] text-white">
                  {t('savedSearches.apply', { defaultValue: 'Apply' })}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => remove(s.id)}
                accessibilityRole="button"
                className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2">
                <Ionicons name="trash-outline" size={14} color={color.muted} />
                <Text className="font-medium text-[13px] text-muted">
                  {t('savedSearches.delete', { defaultValue: 'Delete' })}
                </Text>
              </Pressable>
              <Text variant="caption" className="ml-auto text-[11px]">
                {new Date(s.created_at).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

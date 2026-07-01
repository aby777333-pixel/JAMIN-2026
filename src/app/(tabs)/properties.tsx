import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { FilterBar } from '@/features/buyer/components/FilterBar';
import { PropertyCard } from '@/features/buyer/components/PropertyCard';
import {
  useProperties,
  useProjects,
  usePropertyTypes,
  useRecommended,
  useToggleWishlist,
  useWishlistIds,
} from '@/features/buyer/hooks';
import type { PropertyFilters } from '@/features/buyer/types';
import { color } from '@/theme/tokens';

export default function Properties() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const [filters, setFilters] = useState<PropertyFilters>({ status: 'available', projectId });
  // Apply a project filter when arriving from the Projects browse screen.
  useEffect(() => {
    if (projectId) setFilters((f) => ({ ...f, projectId }));
  }, [projectId]);

  const { data: types = [] } = usePropertyTypes();
  const { data: projects = [] } = useProjects();
  const { data: saved } = useWishlistIds();
  const { data: properties = [], isLoading, isError, refetch, isRefetching } = useProperties(filters);
  const { data: recommended = [] } = useRecommended();
  const toggle = useToggleWishlist();

  const patch = (p: Partial<PropertyFilters>) => setFilters((f) => ({ ...f, ...p }));
  // Only surface "For you" on the unfiltered default view.
  const showForYou =
    recommended.length > 0 && !filters.search && !filters.projectId && !filters.savedOnly && !filters.propertyTypeId;

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <FlatList
        data={properties}
        keyExtractor={(p) => p.id}
        contentContainerClassName="px-5 pb-8 gap-3"
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={
          <View className="gap-3 pb-1 pt-2">
            <Text variant="h1">{t('tabs.properties')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 pr-4">
              <Pressable
                onPress={() => router.push('/projects')}
                className="flex-row items-center gap-1 rounded-full border border-line bg-surface px-3 py-2"
              >
                <Ionicons name="business" size={15} color={color.ink} />
                <Text className="text-[13px] font-semibold text-ink">{t('properties.projects')}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/map')}
                className="flex-row items-center gap-1 rounded-full border border-line bg-surface px-3 py-2"
              >
                <Ionicons name="map" size={15} color={color.ink} />
                <Text className="text-[13px] font-semibold text-ink">{t('properties.map')}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/compare')}
                className="flex-row items-center gap-1 rounded-full border border-line bg-surface px-3 py-2"
              >
                <Ionicons name="git-compare" size={15} color={color.ink} />
                <Text className="text-[13px] font-semibold text-ink">{t('properties.compare')}</Text>
              </Pressable>
            </ScrollView>
            <Input
              placeholder={t('properties.searchPlaceholder')}
              autoCapitalize="characters"
              value={filters.search ?? ''}
              onChangeText={(v) => patch({ search: v })}
            />
            <FilterBar types={types} projects={projects} filters={filters} onChange={patch} />
            {showForYou ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="sparkles" size={14} color={color.gold} />
                  <Text variant="label">{t('properties.forYou')}</Text>
                </View>
                <FlatList
                  horizontal
                  data={recommended}
                  keyExtractor={(p) => `rec-${p.id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-3 pr-2"
                  renderItem={({ item }) => (
                    <Pressable onPress={() => router.push(`/property/${item.id}`)} className="w-44">
                      <View className="overflow-hidden rounded-2xl border border-line bg-surface">
                        <View className="h-24 bg-paper items-center justify-center">
                          <Ionicons name="home" size={22} color={color.line} />
                        </View>
                        <View className="gap-0.5 p-2.5">
                          <Text className="font-mono-bold text-[12px] text-gold-deep" numberOfLines={1}>{item.plot_code}</Text>
                          <Text variant="caption" numberOfLines={1}>{item.project?.name ?? 'Property'}</Text>
                        </View>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            ) : null}
            {!isLoading ? (
              <View className="flex-row items-center justify-between">
                <Text variant="caption">
                  {properties.length}{' '}
                  {properties.length === 1
                    ? t('properties.propertySingular')
                    : t('properties.propertyPlural')}
                </Text>
                <Pressable
                  onPress={() => router.push('/requirements')}
                  className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
                  <Ionicons name="notifications-outline" size={14} color={color.red} />
                  <Text className="text-[12px] font-semibold text-ink">{t('properties.getAlerts')}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <PropertyCard
            item={item}
            saved={saved?.has(item.id) ?? false}
            onToggleSave={() =>
              toggle.mutate({ propertyId: item.id, saved: saved?.has(item.id) ?? false })
            }
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-20">
              <ActivityIndicator color={color.red} />
            </View>
          ) : isError ? (
            <EmptyState icon="cloud-offline" title={t('properties.couldntLoad')} body={t('properties.couldntLoadBody')} />
          ) : (
            <EmptyState
              icon="search"
              title={t('properties.noMatches')}
              body={filters.savedOnly ? t('properties.noMatchesSaved') : t('properties.noMatchesBody')}
            />
          )
        }
      />
    </View>
  );
}

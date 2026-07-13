import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { PropertyCardSkeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { WelcomeTour } from '@/components/WelcomeTour';
import { FilterBar } from '@/features/buyer/components/FilterBar';
import { plotFallbackFor } from '@/features/buyer/components/plotFallbacks';
import { PropertyCard } from '@/features/buyer/components/PropertyCard';
import { VoiceSearch } from '@/features/buyer/components/VoiceSearch';
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
  // Declutter: the chip rows live behind one Filters button (search + voice stay).
  const [showFilters, setShowFilters] = useState(false);
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
  // How many non-default filters are on — shown on the Filters button so
  // hidden chips are never a mystery.
  const activeFilterCount = [
    filters.savedOnly,
    filters.propertyTypeId,
    filters.projectId,
    filters.priceMin != null || filters.priceMax != null,
    filters.facing,
    filters.verifiedOnly,
    filters.premiumOnly,
    (filters.sort ?? 'plot') !== 'plot',
  ].filter(Boolean).length;
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
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[color.red, color.gold]}
            tintColor={color.red}
          />
        }
        ListHeaderComponent={
          <View className="gap-3 pb-1 pt-2">
            {/* First-launch tour — lived on the old Home; Properties is the landing now. */}
            <WelcomeTour />
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
            <View className="flex-row items-center gap-2">
              <View className="min-w-0 flex-1">
                <Input
                  placeholder={t('properties.searchPlaceholder')}
                  autoCapitalize="characters"
                  value={filters.search ?? ''}
                  onChangeText={(v) => patch({ search: v })}
                />
              </View>
              <Pressable
                onPress={() => setShowFilters((s) => !s)}
                className={`h-12 flex-row items-center gap-1.5 rounded-xl border px-3 ${showFilters ? 'border-red bg-red' : 'border-line bg-surface'}`}>
                <Ionicons name="options-outline" size={17} color={showFilters ? '#FFFFFF' : color.ink} />
                <Text className={`text-[13px] font-semibold ${showFilters ? 'text-white' : 'text-ink'}`}>
                  {t('properties.filtersBtn', { defaultValue: 'Filters' })}
                  {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
                </Text>
              </Pressable>
            </View>
            <VoiceSearch types={types} projects={projects} onApply={patch} />
            {showFilters ? (
              <FilterBar types={types} projects={projects} filters={filters} onChange={patch} />
            ) : null}
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
                        <Image
                          source={plotFallbackFor(item.id)}
                          style={{ width: '100%', height: 96 }}
                          contentFit="cover"
                        />
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
            <View className="gap-3">
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
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

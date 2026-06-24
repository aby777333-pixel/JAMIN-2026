import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
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
  const toggle = useToggleWishlist();

  const patch = (p: Partial<PropertyFilters>) => setFilters((f) => ({ ...f, ...p }));

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
            <View className="flex-row items-center justify-between">
              <Text variant="h1">{t('tabs.properties')}</Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => router.push('/projects')}
                  className="flex-row items-center gap-1 rounded-full border border-line bg-surface px-3 py-2"
                >
                  <Ionicons name="business" size={15} color={color.ink} />
                  <Text className="text-[13px] font-semibold text-ink">Projects</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/map')}
                  className="flex-row items-center gap-1 rounded-full border border-line bg-surface px-3 py-2"
                >
                  <Ionicons name="map" size={15} color={color.ink} />
                  <Text className="text-[13px] font-semibold text-ink">Map</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/compare')}
                  className="flex-row items-center gap-1 rounded-full border border-line bg-surface px-3 py-2"
                >
                  <Ionicons name="git-compare" size={15} color={color.ink} />
                  <Text className="text-[13px] font-semibold text-ink">Compare</Text>
                </Pressable>
              </View>
            </View>
            <Input
              placeholder="Search by plot code…"
              autoCapitalize="characters"
              value={filters.search ?? ''}
              onChangeText={(v) => patch({ search: v })}
            />
            <FilterBar types={types} projects={projects} filters={filters} onChange={patch} />
            {!isLoading ? (
              <Text variant="caption">
                {properties.length} {properties.length === 1 ? 'property' : 'properties'}
              </Text>
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
            <EmptyState icon="cloud-offline" title="Couldn't load" body="Pull to refresh and try again." />
          ) : (
            <EmptyState
              icon="search"
              title="No matches"
              body={filters.savedOnly ? 'Save properties to see them here.' : 'Try widening your filters.'}
            />
          )
        }
      />
    </View>
  );
}

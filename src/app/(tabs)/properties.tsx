import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { PropertyCardSkeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { WelcomeTour } from '@/components/WelcomeTour';
import { FilterBar } from '@/features/buyer/components/FilterBar';
import { PropertyCard } from '@/features/buyer/components/PropertyCard';
import { VoiceSearch } from '@/features/buyer/components/VoiceSearch';
import {
  useProperties,
  useProjects,
  usePropertyTypes,
  useToggleWishlist,
  useWishlistIds,
} from '@/features/buyer/hooks';
import { logSearchEvent } from '@/features/buyer/enhancements';
import type { PropertyFilters } from '@/features/buyer/types';
import { can } from '@/lib/access';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';
import { useAuth } from '@/stores/auth';
import { useSearchStore } from '@/stores/search';
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
  // Apply a saved search when arriving from /saved-searches (0100).
  const consumePendingFilters = useSearchStore((s) => s.consumePendingFilters);
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingFilters();
      if (pending) {
        setFilters((f) => ({ ...f, ...(pending as Partial<PropertyFilters>) }));
        setShowFilters(true);
      }
    }, [consumePendingFilters]),
  );
  // Search analytics (0100): log settled text searches, throttled in the helper.
  useEffect(() => {
    const term = filters.search?.trim();
    if (!term) return;
    const timer = setTimeout(() => logSearchEvent(term, filters as Record<string, unknown>), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const { data: types = [] } = usePropertyTypes();
  const { data: projects = [] } = useProjects();
  const { data: saved } = useWishlistIds();
  const { data: properties = [], isLoading, isError, refetch, isRefetching } = useProperties(filters);
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
    filters.bedroomsMin != null,
    filters.bathroomsMin != null,
    filters.furnishing,
    filters.parkingOnly,
    filters.waterOnly,
    filters.cornerOnly,
    filters.gatedOnly,
    filters.roadWidthMin != null,
    filters.possession,
    filters.saleType,
    filters.verifiedDocsOnly,
    filters.loanEligibleOnly,
    filters.newOnly,
    filters.priceReducedOnly,
  ].filter(Boolean).length;

  // Save the current filter combination as a named search (0100). The server
  // notifies on new matching listings while `notify` stays on.
  function onSaveSearch() {
    const parts: string[] = [];
    if (filters.search?.trim()) parts.push(`"${filters.search.trim()}"`);
    const typeName = types.find((ty) => ty.id === filters.propertyTypeId)?.name;
    if (typeName) parts.push(typeName);
    if (filters.bedroomsMin) parts.push(`${filters.bedroomsMin}+ BHK`);
    if (filters.priceMax != null) parts.push(`≤ ₹${Math.round(filters.priceMax / 100000)}L`);
    if (filters.facing) parts.push(filters.facing);
    if (filters.cornerOnly) parts.push(t('properties.filters.corner', { defaultValue: 'Corner plot' }));
    const name = parts.length ? parts.join(' · ') : t('properties.savedSearchDefault', { defaultValue: 'My search' });
    Alert.alert(
      t('properties.saveSearchTitle', { defaultValue: 'Save this search?' }),
      t('properties.saveSearchBody', {
        defaultValue: '"{{name}}" — we\'ll notify you when a matching property goes live.',
        name,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('properties.saveSearchAction', { defaultValue: 'Save' }),
          onPress: async () => {
            const { error } = await supabase
              .from('saved_searches')
              .insert({ name, filters: filters as unknown as Json });
            if (error) Alert.alert(t('properties.saveSearchFailed', { defaultValue: 'Could not save' }), error.message);
            else
              Alert.alert(
                t('properties.saveSearchDone', { defaultValue: 'Search saved' }),
                t('properties.saveSearchDoneBody', { defaultValue: 'Manage it under Account → Saved searches.' }),
              );
          },
        },
      ],
    );
  }

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
            <GreetingHeader />
            <QuickActions />
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
              <FilterBar types={types} projects={projects} filters={filters} onChange={patch} onSaveSearch={onSaveSearch} />
            ) : null}
            {/* "For you" mini-rail removed (owner: no little blocks) — the
                recommendation hook/api stay in features/buyer for later use. */}
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

/** Personal greeting above the page title — toolkit-style warmth, no logic. */
function GreetingHeader() {
  const { t } = useTranslation();
  const name = useAuth((s) => s.profile?.full_name);
  const first = (name ?? '').trim().split(/\s+/)[0];
  return (
    <View className="gap-0.5">
      {first ? (
        <Text variant="caption">
          {t('properties.greeting', { defaultValue: 'Welcome back, {{name}} 👋', name: first })}
        </Text>
      ) : null}
      <Text variant="h1">{t('tabs.properties')}</Text>
    </View>
  );
}

/** Three tinted role-aware shortcuts (toolkit-style quick actions). */
function QuickActions() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const role = profile?.role_slug ?? 'buyer';
  const isSeller = role === 'seller' || role === 'builder' || role === 'developer';
  const isPartner = !isSeller && can(profile, 'sell');

  const actions: { icon: keyof typeof Ionicons.glyphMap; label: string; to: string; tint: string; fg: string }[] =
    isPartner
      ? [
          { icon: 'flash', label: t('properties.qa.leads', { defaultValue: 'Leads' }), to: '/leads', tint: 'bg-red/10', fg: color.red },
          { icon: 'person-add', label: t('properties.qa.recruit', { defaultValue: 'Recruit' }), to: '/recruit', tint: 'bg-gold/15', fg: color.goldDeep },
          { icon: 'speedometer', label: t('properties.qa.dashboard', { defaultValue: 'Dashboard' }), to: '/promoter-hub', tint: 'bg-charcoal/10', fg: color.charcoal },
        ]
      : isSeller
        ? [
            { icon: 'add-circle', label: t('properties.qa.list', { defaultValue: 'List property' }), to: '/sell/new', tint: 'bg-red/10', fg: color.red },
            { icon: 'home', label: t('properties.qa.myListings', { defaultValue: 'My listings' }), to: '/sell', tint: 'bg-gold/15', fg: color.goldDeep },
            { icon: 'folder-open', label: t('properties.qa.documents', { defaultValue: 'Documents' }), to: '/documents', tint: 'bg-charcoal/10', fg: color.charcoal },
          ]
        : [
            { icon: 'heart', label: t('properties.qa.saved', { defaultValue: 'Saved' }), to: '/recent', tint: 'bg-red/10', fg: color.red },
            { icon: 'git-compare', label: t('properties.qa.compare', { defaultValue: 'Compare' }), to: '/compare', tint: 'bg-gold/15', fg: color.goldDeep },
            { icon: 'notifications', label: t('properties.qa.alerts', { defaultValue: 'Alerts' }), to: '/requirements', tint: 'bg-charcoal/10', fg: color.charcoal },
          ];

  return (
    <View className="flex-row gap-3">
      {actions.map((a) => (
        <Pressable
          key={a.label}
          onPress={() => router.push(a.to as never)}
          accessibilityRole="button"
          className={`flex-1 items-center gap-1.5 rounded-2xl border border-line px-2 py-3 ${a.tint}`}>
          <Ionicons name={a.icon} size={20} color={a.fg} />
          <Text className="text-center text-[11px] font-semibold text-ink" numberOfLines={1}>
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

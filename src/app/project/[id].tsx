import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { PropertyCard } from '@/features/buyer/components/PropertyCard';
import { useProjectById, useProperties, useToggleWishlist, useWishlistIds } from '@/features/buyer/hooks';
import type { PropertyListItem } from '@/features/buyer/types';
import { color } from '@/theme/tokens';

function firstImage(media: unknown): string | undefined {
  if (Array.isArray(media) && media.length) {
    const m = media[0];
    if (typeof m === 'string') return m;
    if (m && typeof m === 'object' && 'url' in m) return String((m as { url: unknown }).url);
  }
  return undefined;
}

/**
 * Project detail (§3/§4) — admin-uploaded project with a hero image (drawn from its
 * listings) and every available plot in it. Fully dynamic from the DB.
 */
export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isLoading: pLoading } = useProjectById(id);
  const { data: plots = [], isLoading: lLoading } = useProperties({ status: 'available', projectId: id });
  const { data: saved } = useWishlistIds();
  const toggle = useToggleWishlist();

  const hero = plots.map((p) => firstImage((p as PropertyListItem).media)).find(Boolean);

  if (pLoading) {
    return (
      <Screen scroll={false} contentClassName="justify-center">
        <ActivityIndicator color={color.red} />
      </Screen>
    );
  }
  if (!project) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Project" />
        <Text variant="body" className="mt-8 text-center text-muted">
          This project is no longer available.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title={project.name as string} />

      <View className="overflow-hidden rounded-2xl border border-line bg-paper" style={{ height: 170 }}>
        {hero ? (
          <Image source={{ uri: hero }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="business" size={36} color={color.line} />
          </View>
        )}
      </View>

      <View className="gap-1">
        <Text variant="h1">{project.name as string}</Text>
        <View className="flex-row items-center gap-2">
          {project.code ? <Text className="font-mono text-[13px] text-gold-deep">{project.code as string}</Text> : null}
          {project.location ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="location-outline" size={14} color={color.muted} />
              <Text variant="caption">{project.location as string}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text variant="label">
        Available plots {!lLoading ? `(${plots.length})` : ''}
      </Text>

      {lLoading ? (
        <ActivityIndicator color={color.red} />
      ) : plots.length === 0 ? (
        <EmptyState
          icon="home"
          title="No plots available"
          body="Every plot in this project is currently sold or reserved. Check back soon."
        />
      ) : (
        <View className="gap-3">
          {plots.map((item) => (
            <PropertyCard
              key={item.id}
              item={item}
              saved={saved?.has(item.id) ?? false}
              onToggleSave={() => toggle.mutate({ propertyId: item.id, saved: saved?.has(item.id) ?? false })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

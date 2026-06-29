import { ActivityIndicator } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { PropertyCard } from '@/features/buyer/components/PropertyCard';
import { useRecentlyViewed, useToggleWishlist, useWishlistIds } from '@/features/buyer/hooks';
import { color } from '@/theme/tokens';

export default function Recent() {
  const { data: items = [], isLoading } = useRecentlyViewed(20);
  const { data: saved } = useWishlistIds();
  const toggle = useToggleWishlist();

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Recently viewed" />
      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-8" />
      ) : items.length === 0 ? (
        <EmptyState icon="time" title="Nothing yet" body="Properties you open will appear here." />
      ) : (
        items.map((item) => (
          <PropertyCard
            key={item.id}
            item={item}
            saved={saved?.has(item.id) ?? false}
            onToggleSave={() => toggle.mutate({ propertyId: item.id, saved: saved?.has(item.id) ?? false })}
          />
        ))
      )}
    </Screen>
  );
}

import { ScrollView, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { FACINGS } from '@/features/astro/vastu';
import type { PropertyFilters } from '../types';

interface Option {
  id: string;
  name: string;
}

export function FilterBar({
  types,
  projects,
  filters,
  onChange,
}: {
  types: Option[];
  projects: Option[];
  filters: PropertyFilters;
  onChange: (patch: Partial<PropertyFilters>) => void;
}) {
  return (
    <View className="gap-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4">
        <Chip
          label="♡ Saved"
          active={!!filters.savedOnly}
          onPress={() => onChange({ savedOnly: !filters.savedOnly })}
        />
        <Chip
          label="All types"
          active={!filters.propertyTypeId}
          onPress={() => onChange({ propertyTypeId: null })}
        />
        {types.map((t) => (
          <Chip
            key={t.id}
            label={t.name}
            active={filters.propertyTypeId === t.id}
            onPress={() => onChange({ propertyTypeId: t.id })}
          />
        ))}
      </ScrollView>

      {projects.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-4">
          <Chip
            label="All projects"
            active={!filters.projectId}
            onPress={() => onChange({ projectId: null })}
          />
          {projects.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              active={filters.projectId === p.id}
              onPress={() => onChange({ projectId: p.id })}
            />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4 items-center">
        <Text variant="caption" className="mr-1">
          Budget
        </Text>
        {PRICE_BANDS.map((b) => {
          const active = filters.priceMax === b.max && (filters.priceMin ?? 0) === (b.min ?? 0);
          return (
            <Chip
              key={b.label}
              label={b.label}
              active={active}
              onPress={() =>
                onChange(active ? { priceMin: null, priceMax: null } : { priceMin: b.min, priceMax: b.max })
              }
            />
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4 items-center">
        <Text variant="caption" className="mr-1">
          🧭 Facing
        </Text>
        <Chip label="Any" active={!filters.facing} onPress={() => onChange({ facing: null })} />
        {FACINGS.map((f) => (
          <Chip
            key={f}
            label={f}
            active={filters.facing === f}
            onPress={() => onChange({ facing: filters.facing === f ? null : f })}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4 items-center">
        <Chip label="✓ Verified" active={!!filters.verifiedOnly} onPress={() => onChange({ verifiedOnly: !filters.verifiedOnly })} />
        <Chip label="★ Premium" active={!!filters.premiumOnly} onPress={() => onChange({ premiumOnly: !filters.premiumOnly })} />
        <Text variant="caption" className="mx-1">
          Sort
        </Text>
        {SORTS.map((s) => (
          <Chip
            key={s.value}
            label={s.label}
            active={(filters.sort ?? 'plot') === s.value}
            onPress={() => onChange({ sort: s.value })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const SORTS: { label: string; value: NonNullable<PropertyFilters['sort']> }[] = [
  { label: 'Plot', value: 'plot' },
  { label: 'Newest', value: 'newest' },
  { label: 'Price ↑', value: 'price_asc' },
  { label: 'Price ↓', value: 'price_desc' },
];

const PRICE_BANDS: { label: string; min: number | null; max: number | null }[] = [
  { label: '< ₹20L', min: null, max: 2_000_000 },
  { label: '₹20L–50L', min: 2_000_000, max: 5_000_000 },
  { label: '₹50L–1Cr', min: 5_000_000, max: 10_000_000 },
  { label: '₹1Cr+', min: 10_000_000, max: null },
];

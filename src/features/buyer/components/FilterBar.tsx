import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4">
        <Chip
          label={`♡ ${t('properties.filters.saved')}`}
          active={!!filters.savedOnly}
          onPress={() => onChange({ savedOnly: !filters.savedOnly })}
        />
        <Chip
          label={t('properties.filters.allTypes')}
          active={!filters.propertyTypeId}
          onPress={() => onChange({ propertyTypeId: null })}
        />
        {types.map((ty) => (
          <Chip
            key={ty.id}
            label={ty.name}
            active={filters.propertyTypeId === ty.id}
            onPress={() => onChange({ propertyTypeId: ty.id })}
          />
        ))}
      </ScrollView>

      {projects.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-4">
          <Chip
            label={t('properties.filters.allProjects')}
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
          {t('properties.filters.budget')}
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
          🧭 {t('properties.filters.facing')}
        </Text>
        <Chip label={t('properties.filters.any')} active={!filters.facing} onPress={() => onChange({ facing: null })} />
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
        <Chip label={`✓ ${t('properties.filters.verified')}`} active={!!filters.verifiedOnly} onPress={() => onChange({ verifiedOnly: !filters.verifiedOnly })} />
        <Chip label={`★ ${t('properties.filters.premium')}`} active={!!filters.premiumOnly} onPress={() => onChange({ premiumOnly: !filters.premiumOnly })} />
        <Text variant="caption" className="mx-1">
          {t('properties.filters.sort')}
        </Text>
        {SORTS.map((s) => (
          <Chip
            key={s.value}
            label={t(s.key)}
            active={(filters.sort ?? 'plot') === s.value}
            onPress={() => onChange({ sort: s.value })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const SORTS: { key: string; value: NonNullable<PropertyFilters['sort']> }[] = [
  { key: 'properties.filters.sortPlot', value: 'plot' },
  { key: 'properties.filters.sortNewest', value: 'newest' },
  { key: 'properties.filters.priceUp', value: 'price_asc' },
  { key: 'properties.filters.priceDown', value: 'price_desc' },
];

const PRICE_BANDS: { label: string; min: number | null; max: number | null }[] = [
  { label: '< ₹20L', min: null, max: 2_000_000 },
  { label: '₹20L–50L', min: 2_000_000, max: 5_000_000 },
  { label: '₹50L–1Cr', min: 5_000_000, max: 10_000_000 },
  { label: '₹1Cr+', min: 10_000_000, max: null },
];

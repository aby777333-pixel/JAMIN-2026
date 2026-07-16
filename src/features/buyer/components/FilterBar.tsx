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
  onSaveSearch,
}: {
  types: Option[];
  projects: Option[];
  filters: PropertyFilters;
  onChange: (patch: Partial<PropertyFilters>) => void;
  /** Optional: shown as a "Save this search" chip when any filter is active. */
  onSaveSearch?: () => void;
}) {
  const { t } = useTranslation();
  const toggle = (key: keyof PropertyFilters) => () => onChange({ [key]: !filters[key] } as Partial<PropertyFilters>);
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
          {t('properties.filters.facing')}
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

      {/* Advanced filters (0100): home specifics — attrs-driven, so they simply
          match nothing until the admin/seller sets those attrs on listings. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4 items-center">
        <Text variant="caption" className="mr-1">
          {t('properties.filters.home', { defaultValue: 'Home' })}
        </Text>
        {[2, 3].map((n) => (
          <Chip
            key={`bed${n}`}
            label={t('properties.filters.beds', { defaultValue: '{{n}}+ BHK', n })}
            active={filters.bedroomsMin === n}
            onPress={() => onChange({ bedroomsMin: filters.bedroomsMin === n ? null : n })}
          />
        ))}
        <Chip
          label={t('properties.filters.baths2', { defaultValue: '2+ Baths' })}
          active={filters.bathroomsMin === 2}
          onPress={() => onChange({ bathroomsMin: filters.bathroomsMin === 2 ? null : 2 })}
        />
        <Chip label={t('properties.filters.furnished', { defaultValue: 'Furnished' })} active={filters.furnishing === 'furnished'} onPress={() => onChange({ furnishing: filters.furnishing === 'furnished' ? null : 'furnished' })} />
        <Chip label={t('properties.filters.parking', { defaultValue: 'Parking' })} active={!!filters.parkingOnly} onPress={toggle('parkingOnly')} />
        <Chip label={t('properties.filters.water', { defaultValue: 'Water' })} active={!!filters.waterOnly} onPress={toggle('waterOnly')} />
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4 items-center">
        <Text variant="caption" className="mr-1">
          {t('properties.filters.plot', { defaultValue: 'Plot' })}
        </Text>
        <Chip label={t('properties.filters.corner', { defaultValue: 'Corner plot' })} active={!!filters.cornerOnly} onPress={toggle('cornerOnly')} />
        <Chip label={t('properties.filters.gated', { defaultValue: 'Gated' })} active={!!filters.gatedOnly} onPress={toggle('gatedOnly')} />
        <Chip
          label={t('properties.filters.road30', { defaultValue: 'Road 30ft+' })}
          active={filters.roadWidthMin === 30}
          onPress={() => onChange({ roadWidthMin: filters.roadWidthMin === 30 ? null : 30 })}
        />
        <Chip
          label={t('properties.filters.ready', { defaultValue: 'Ready' })}
          active={filters.possession === 'ready'}
          onPress={() => onChange({ possession: filters.possession === 'ready' ? null : 'ready' })}
        />
        <Chip
          label={t('properties.filters.underConstruction', { defaultValue: 'Under construction' })}
          active={filters.possession === 'under_construction'}
          onPress={() => onChange({ possession: filters.possession === 'under_construction' ? null : 'under_construction' })}
        />
        <Chip
          label={t('properties.filters.resale', { defaultValue: 'Resale' })}
          active={filters.saleType === 'resale'}
          onPress={() => onChange({ saleType: filters.saleType === 'resale' ? null : 'resale' })}
        />
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4 items-center">
        <Text variant="caption" className="mr-1">
          {t('properties.filters.trust', { defaultValue: 'Trust' })}
        </Text>
        <Chip label={`📄 ${t('properties.filters.verifiedDocs', { defaultValue: 'Docs verified' })}`} active={!!filters.verifiedDocsOnly} onPress={toggle('verifiedDocsOnly')} />
        <Chip label={`🏦 ${t('properties.filters.loanEligible', { defaultValue: 'Loan eligible' })}`} active={!!filters.loanEligibleOnly} onPress={toggle('loanEligibleOnly')} />
        <Chip label={`🆕 ${t('properties.filters.newListings', { defaultValue: 'New this week' })}`} active={!!filters.newOnly} onPress={toggle('newOnly')} />
        <Chip label={`📉 ${t('properties.filters.priceReduced', { defaultValue: 'Price reduced' })}`} active={!!filters.priceReducedOnly} onPress={toggle('priceReducedOnly')} />
        {onSaveSearch ? (
          <Chip
            label={`💾 ${t('properties.filters.saveSearch', { defaultValue: 'Save this search' })}`}
            active={false}
            onPress={onSaveSearch}
          />
        ) : null}
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

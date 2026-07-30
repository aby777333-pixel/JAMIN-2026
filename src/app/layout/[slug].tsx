import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import type { LayoutPlot, PlotStatus } from '@/features/layouts/api';
import { PlotMap } from '@/features/layouts/PlotMap';
import { PlotSheet } from '@/features/layouts/PlotSheet';
import { useLayout, useLayoutRealtime } from '@/features/layouts/hooks';
import { color } from '@/theme/tokens';

const STATS: Array<{ key: PlotStatus | 'total'; label: string; tint: string }> = [
  { key: 'total', label: 'Total', tint: color.ink },
  { key: 'available', label: 'Available', tint: color.success },
  { key: 'reserved', label: 'On hold', tint: color.warn },
  { key: 'booked', label: 'Booked', tint: color.red },
  { key: 'sold', label: 'Sold', tint: '#4A4A4A' },
];

const FACINGS = ['north', 'south', 'east', 'west'] as const;

/**
 * Interactive plot selection over a sanctioned DTCP layout.
 *
 * The plan is drawn to the approval drawing's own geometry; availability is
 * live, so a plot taken by another buyer repaints here without a refresh.
 */
export default function LayoutScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading, error } = useLayout(slug);
  useLayoutRealtime(slug, data?.layout?.id);

  const [selected, setSelected] = useState<LayoutPlot | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [status, setStatus] = useState<PlotStatus | null>(null);
  const [facing, setFacing] = useState<(typeof FACINGS)[number] | null>(null);
  const [cornerOnly, setCornerOnly] = useState(false);

  const plots = data?.plots ?? [];

  const visible = useMemo(() => {
    const set = new Set<string>();
    plots.forEach((p) => {
      if (status && p.status !== status) return;
      if (facing && p.facing !== facing) return;
      if (cornerOnly && !p.isCorner) return;
      set.add(p.id);
    });
    return set;
  }, [plots, status, facing, cornerOnly]);

  if (isLoading) {
    return (
      <Screen scroll={false} contentClassName="justify-center">
        <ActivityIndicator color={color.red} />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <BackHeader title="Layout" />
        <EmptyState
          icon="map"
          title="Layout not available"
          body="This layout is not published yet. Please check back soon."
        />
      </Screen>
    );
  }

  const { layout, summary } = data;
  const filtersOn = !!status || !!facing || cornerOnly;

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title={layout.name} />

      <View className="gap-1">
        <Text variant="caption">{layout.place}</Text>
        {layout.approvalNo ? (
          <View className="flex-row">
            <View className="flex-row items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1">
              <Ionicons name="shield-checkmark" size={12} color={color.goldDeep} />
              <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-gold-deep">
                DTCP {layout.approvalNo}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* live project summary */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
        {STATS.map((s) => (
          <View
            key={s.key}
            className="mx-1 min-w-[86px] rounded-2xl border border-line bg-surface px-3 py-2">
            <Text className="text-[20px] font-bold" style={{ color: s.tint }}>
              {s.key === 'total' ? summary.total : summary[s.key]}
            </Text>
            <Text variant="caption">{s.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
        <Chip label="Available" active={status === 'available'} onPress={() => setStatus(status === 'available' ? null : 'available')} />
        {FACINGS.map((f) => (
          <Chip
            key={f}
            label={f[0].toUpperCase() + f.slice(1)}
            active={facing === f}
            onPress={() => setFacing(facing === f ? null : f)}
          />
        ))}
        <Chip label="Corner" active={cornerOnly} onPress={() => setCornerOnly((v) => !v)} />
        {filtersOn ? (
          <Chip
            label="Clear"
            active={false}
            onPress={() => {
              setStatus(null);
              setFacing(null);
              setCornerOnly(false);
            }}
          />
        ) : null}
      </ScrollView>

      {filtersOn ? (
        <Text variant="caption">
          {visible.size} of {plots.length} plots match
        </Text>
      ) : null}

      <View className="overflow-hidden rounded-3xl border border-line bg-surface">
        <PlotMap
          geometry={layout.geometry}
          plots={plots}
          selected={selected?.id}
          visible={filtersOn ? visible : undefined}
          height={480}
          onSelect={(p) => {
            setSelected(p);
            setSheetOpen(true);
          }}
        />
      </View>

      <Text variant="caption" className="leading-5">
        Pinch to zoom, drag to pan. Tap any plot for its full detail. Plan traced from the sanctioned
        approval drawing; sizes and areas are quoted from the plot schedule.
      </Text>

      <PlotSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        plot={selected}
        layout={layout}
        slug={slug}
        onPay={() => {
          setSheetOpen(false);
          router.push('/payments');
        }}
      />
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-1 rounded-full border px-3.5 py-2"
      style={{
        borderColor: active ? color.red : color.line,
        backgroundColor: active ? `${color.red}12` : color.surface,
      }}>
      <Text className="text-[13px] font-medium" style={{ color: active ? color.red : color.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

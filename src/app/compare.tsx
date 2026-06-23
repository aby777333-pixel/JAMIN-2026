import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { useProperties } from '@/features/buyer/hooks';
import type { PropertyListItem } from '@/features/buyer/types';
import { emi, formatINR } from '@/lib/money';

const MAX = 3;
const ROW_H = 'h-14';

/** §4 Buyer App — Compare Properties. Pick up to three plots and line them up side by side. */
export default function Compare() {
  const { data: properties = [] } = useProperties({ status: 'available' });
  const [picked, setPicked] = useState<string[]>([]);

  const selected = picked
    .map((id) => properties.find((p) => p.id === id))
    .filter(Boolean) as PropertyListItem[];

  function toggle(id: string) {
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX ? cur : [...cur, id],
    );
  }

  const rows: { label: string; value: (p: PropertyListItem) => string }[] = [
    { label: 'Project', value: (p) => p.project?.name ?? '—' },
    { label: 'Type', value: (p) => p.type?.name ?? '—' },
    { label: 'Price', value: (p) => formatINR(p.price) },
    { label: 'Est. EMI / mo', value: (p) => formatINR(emi(Number(p.price) * 0.8, 9, 240)) },
  ];

  return (
    <Screen scroll={false} contentClassName="gap-3">
      <BackHeader title="Compare properties" />
      <Text variant="caption" className="px-1">
        Tap up to {MAX} plots to compare. EMI assumes 80% loan, 9% p.a., 20 yrs.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-12 grow-0">
        <View className="flex-row gap-2 px-1">
          {properties.map((p) => {
            const on = picked.includes(p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => toggle(p.id)}
                className={`rounded-full border px-3 py-2 ${on ? 'border-red bg-red/10' : 'border-line bg-surface'}`}
              >
                <Text className={`font-mono text-[13px] ${on ? 'text-red' : 'text-ink'}`}>
                  {p.plot_code}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {selected.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text variant="body" className="text-center text-muted">
            Select plots above to compare them side by side.
          </Text>
        </View>
      ) : (
        <View className="flex-row border-t border-line pt-2">
          {/* label column */}
          <View className="w-28">
            <View className={`${ROW_H} justify-center`}>
              <Text variant="label">Plot</Text>
            </View>
            {rows.map((r) => (
              <View key={r.label} className={`${ROW_H} justify-center border-t border-line`}>
                <Text variant="caption">{r.label}</Text>
              </View>
            ))}
            <View className={`${ROW_H} justify-center border-t border-line`}>
              <Text variant="caption">Status</Text>
            </View>
          </View>

          {/* value columns */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {selected.map((p) => (
                <View key={p.id} className="w-36 px-3">
                  <View className={`${ROW_H} justify-center`}>
                    <Text variant="title" className="font-mono-bold text-red" numberOfLines={1}>
                      {p.plot_code}
                    </Text>
                  </View>
                  {rows.map((r) => (
                    <View key={r.label} className={`${ROW_H} justify-center border-t border-line`}>
                      <Text variant="body" numberOfLines={2}>
                        {r.value(p)}
                      </Text>
                    </View>
                  ))}
                  <View className={`${ROW_H} justify-center border-t border-line`}>
                    <StatusPill status={p.status} />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </Screen>
  );
}

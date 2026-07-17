import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { TileGrid, ToolTile } from '@/components/ui/ToolTile';

export interface TileTabSection {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: number;
  content: ReactNode;
}

/**
 * Square-tab section switcher — the calculators-hub interaction generalized
 * (owner brief: "More information should show the little square tabs; tapping
 * one pops up its info"). Renders a ToolTile grid; only the selected section's
 * content mounts below it, so data fetching stays deferred exactly like the
 * Disclosure children it replaces. Purely presentational.
 */
export function TileTabs({
  sections,
  initialKey,
}: {
  sections: TileTabSection[];
  initialKey?: string;
}) {
  const [selected, setSelected] = useState(initialKey ?? sections[0]?.key ?? '');
  const current = sections.find((s) => s.key === selected) ?? sections[0];
  if (sections.length === 0) return null;
  return (
    <View className="gap-2">
      <TileGrid>
        {sections.map((s) => (
          <ToolTile
            key={s.key}
            icon={s.icon}
            label={s.label}
            accent={s.accent}
            active={current?.key === s.key}
            onPress={() => setSelected(s.key)}
          />
        ))}
      </TileGrid>
      <View className="gap-4">{current?.content}</View>
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { accentFor, color } from '@/theme/tokens';

/**
 * Collapsible section — the redesign's "hide, don't delete" primitive. Secondary
 * information sits behind one clear tap; children only mount when opened, so any
 * data they fetch is deferred until the user asks for it.
 *
 * Pass `icon` + `accent` (palette index, see theme `category`) to render the
 * standardized square-card header — tinted icon chip and accent-washed border,
 * the same colour language as ToolTile/ListRow. Omit both for the original
 * plain header; the expand/collapse behaviour is identical either way.
 */
export function Disclosure({
  title,
  subtitle,
  children,
  initiallyOpen = false,
  icon,
  accent,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  initiallyOpen?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: number;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const a = accent === undefined ? null : accentFor(accent);
  return (
    <View
      className="overflow-hidden rounded-2xl border border-line bg-surface"
      style={a ? { borderColor: `${a.main}40` } : null}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center gap-3 px-4 py-4"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}>
        {icon ? (
          <View
            className="h-10 w-10 items-center justify-center rounded-xl border border-line bg-paper"
            style={a ? { backgroundColor: a.soft, borderColor: `${a.main}40` } : null}>
            <Ionicons name={icon} size={18} color={a ? a.main : color.ink} />
          </View>
        ) : null}
        <View className="min-w-0 flex-1">
          <Text variant="title" className="text-[15px]">
            {title}
          </Text>
          {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={a ? a.main : color.muted} />
      </Pressable>
      {open ? <View className="gap-4 border-t border-line px-4 pb-4 pt-4">{children}</View> : null}
    </View>
  );
}

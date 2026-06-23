import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Text } from './Text';
import { color } from '@/theme/tokens';

/** Branded placeholder for modules that fill in across later phases. */
export function EmptyState({
  icon,
  title,
  body,
  phase,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  phase?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-6 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-red/10">
        <Ionicons name={icon} size={28} color={color.red} />
      </View>
      <Text variant="h2" className="text-center">
        {title}
      </Text>
      <Text variant="body" className="text-center text-muted">
        {body}
      </Text>
      {phase ? (
        <View className="mt-1 rounded-full border border-line bg-surface px-3 py-1">
          <Text className="font-medium text-[11px] uppercase tracking-[1px] text-gold-deep">
            {phase}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

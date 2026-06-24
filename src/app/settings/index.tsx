import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

const ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; href: string }[] = [
  { icon: 'apps', label: "What's included", sub: 'Explore all platform features', href: '/features' },
  { icon: 'notifications', label: 'Notifications', sub: 'Choose your alerts', href: '/settings/notifications' },
  { icon: 'lock-closed', label: 'Security & language', sub: 'App lock, language', href: '/settings/security' },
];

export default function Settings() {
  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Settings" />
      {ITEMS.map((it) => (
        <Pressable key={it.href} onPress={() => router.push(it.href as never)}>
          <Card className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
              <Ionicons name={it.icon} size={18} color={color.red} />
            </View>
            <View className="flex-1">
              <Text variant="title">{it.label}</Text>
              <Text variant="caption">{it.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={color.muted} />
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

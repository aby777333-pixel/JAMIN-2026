import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, Share, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SITE_URL } from '@/lib/site';
import { color } from '@/theme/tokens';

const ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; href: string }[] = [
  { icon: 'person-circle', label: 'Edit profile', sub: 'Name, phone, designation, photo', href: '/profile' },
  { icon: 'calendar', label: 'My site visits', sub: 'Bookings & check-in', href: '/visits' },
  { icon: 'people', label: 'Shared shortlists', sub: 'Decide together with family', href: '/shortlists' },
  { icon: 'apps', label: "What's included", sub: 'Explore all platform features', href: '/features' },
  { icon: 'notifications', label: 'Notifications', sub: 'Choose your alerts', href: '/settings/notifications' },
  { icon: 'lock-closed', label: 'Security & language', sub: 'App lock, language', href: '/settings/security' },
  { icon: 'help-circle', label: 'Help & FAQ', sub: 'Answers to common questions', href: '/help' },
  { icon: 'help-buoy', label: 'Help & Support', sub: 'Contact, social links, about', href: '/support' },
];

export default function Settings() {
  const version = (Constants.expoConfig?.version as string) ?? '1.0.0';

  async function shareApp() {
    try {
      await Share.share({
        message: `Discover verified land & plots on JAMIN Properties. ${SITE_URL}`,
        url: SITE_URL,
      });
    } catch {
      /* user dismissed */
    }
  }

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

      <Pressable onPress={shareApp}>
        <Card className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
            <Ionicons name="gift" size={18} color={color.red} />
          </View>
          <View className="flex-1">
            <Text variant="title">Tell a friend</Text>
            <Text variant="caption">Share JAMIN Properties with others</Text>
          </View>
          <Ionicons name="share-social" size={18} color={color.muted} />
        </Card>
      </Pressable>

      <Text variant="caption" className="mt-2 text-center">
        JAMIN Properties · v{version}
      </Text>
    </Screen>
  );
}

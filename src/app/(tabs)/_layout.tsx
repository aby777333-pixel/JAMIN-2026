import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUnreadCount } from '@/features/notifications/api';
import { tap } from '@/lib/haptics';
import { color } from '@/theme/tokens';

/**
 * Four calm bottom tabs — Properties, Investments, Activity, Account
 * (simplification brief §6). The earlier tab routes (index/Home, card,
 * network) stay REGISTERED but hidden (href: null) so every existing
 * router.push / deep link keeps working; their content now lives inside the
 * four sections. Role gating happens inside each screen (e.g. Investments
 * renders the commission wallet for partners and bookings for buyers), so the
 * shell itself is identical for every role — no tab-set changes on role flips.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: unread = 0 } = useUnreadCount();

  return (
    <Tabs
      screenListeners={{ tabPress: () => tap() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.red,
        tabBarInactiveTintColor: color.muted,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopWidth: 1,
          borderTopColor: color.line,
          // Edge-to-edge is on (app.json) so the Android system nav bar overlays
          // the app — lift the tab bar above it with the bottom safe-area inset.
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
      }}>
      {/* Hidden: Home merged into the four tabs; index only redirects. */}
      <Tabs.Screen name="index" options={{ href: null }} />
      {/* App-store convention: the focused tab shows the FILLED glyph, the
          rest show outlines — pure styling, identical navigation. */}
      {/* App-store convention: the focused tab shows the FILLED glyph. A padded
          pill wrapper was tried here and CLIPPED the icons inside the fixed
          tab-bar icon box on device — keep icons bare. */}
      <Tabs.Screen
        name="properties"
        options={{
          title: t('tabs.properties'),
          tabBarIcon: ({ color: c, size, focused }) => (
            <Ionicons name={focused ? 'business' : 'business-outline'} color={c} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tabs.investments'),
          tabBarIcon: ({ color: c, size }) => <Ionicons name="trending-up" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t('tabs.activity'),
          tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: color.red, fontSize: 10 },
          tabBarIcon: ({ color: c, size, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} color={c} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('tabs.account'),
          tabBarIcon: ({ color: c, size, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} color={c} size={size} />
          ),
        }}
      />
      {/* Hidden but routable: reached from Account (My card / My team). */}
      <Tabs.Screen name="card" options={{ href: null }} />
      <Tabs.Screen name="network" options={{ href: null }} />
    </Tabs>
  );
}

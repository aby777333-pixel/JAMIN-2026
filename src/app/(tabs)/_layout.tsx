import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUnreadCount } from '@/features/notifications/api';
import { tap } from '@/lib/haptics';
import { color } from '@/theme/tokens';

/** Tinted pill behind the focused tab's icon — pure styling, brand palette. */
function TabIcon({
  focused,
  tint,
  children,
}: {
  focused: boolean;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: focused ? tint : 'transparent',
      }}>
      {children}
    </View>
  );
}

const TAB_TINTS = {
  properties: 'rgba(253, 0, 1, 0.10)',   // brand red
  wallet: 'rgba(251, 188, 21, 0.18)',    // gold
  activity: 'rgba(253, 0, 1, 0.10)',     // brand red
  account: 'rgba(200, 145, 30, 0.16)',   // gold-deep
};

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
      <Tabs.Screen
        name="properties"
        options={{
          title: t('tabs.properties'),
          tabBarIcon: ({ color: c, size, focused }) => (
            <TabIcon focused={focused} tint={TAB_TINTS.properties}>
              <Ionicons name={focused ? 'business' : 'business-outline'} color={c} size={size} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tabs.investments'),
          tabBarIcon: ({ color: c, size, focused }) => (
            <TabIcon focused={focused} tint={TAB_TINTS.wallet}>
              <Ionicons name="trending-up" color={c} size={focused ? size + 1 : size} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t('tabs.activity'),
          tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: color.red, fontSize: 10 },
          tabBarIcon: ({ color: c, size, focused }) => (
            <TabIcon focused={focused} tint={TAB_TINTS.activity}>
              <Ionicons name={focused ? 'notifications' : 'notifications-outline'} color={c} size={size} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('tabs.account'),
          tabBarIcon: ({ color: c, size, focused }) => (
            <TabIcon focused={focused} tint={TAB_TINTS.account}>
              <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} color={c} size={size} />
            </TabIcon>
          ),
        }}
      />
      {/* Hidden but routable: reached from Account (My card / My team). */}
      <Tabs.Screen name="card" options={{ href: null }} />
      <Tabs.Screen name="network" options={{ href: null }} />
    </Tabs>
  );
}

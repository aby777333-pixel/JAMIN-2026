import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabGarden } from '@/components/brand/LeafDecor';
import { can } from '@/lib/access';
import { tap } from '@/lib/haptics';
import { accents, color } from '@/theme/tokens';
import { useAuth } from '@/stores/auth';

/** Per-tab active colors — each tab lights up in its own hue. */
const TAB_COLOR = {
  index: color.red, //          Home = brand red
  properties: accents[5].main, // blue
  card: color.goldDeep, //      business card = gold
  network: accents[6].main, //  violet
  wallet: accents[3].main, //   green
} as const;

/**
 * Role-aware bottom tabs (SuperPrompt §5: "role-aware bottom tabs").
 * Buyers get a discovery-focused shell; partners (agent and above) also get
 * Network + Wallet. Role comes from the DB profile — never hardcoded (§13).
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const profile = useAuth((s) => s.profile);

  return (
    <Tabs
      screenListeners={{ tabPress: () => tap() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.red,
        tabBarInactiveTintColor: color.muted,
        // Plants & leaves growing over the tab bar (decorative background layer).
        tabBarBackground: () => <TabGarden />,
        tabBarStyle: {
          backgroundColor: color.surface,
          // Floating elevated bar instead of a flat hairline.
          borderTopWidth: 0,
          shadowColor: color.charcoal,
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 16,
          // Edge-to-edge is on (app.json) so the Android system nav bar overlays
          // the app — lift the tab bar above it with the bottom safe-area inset.
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarActiveTintColor: TAB_COLOR.index,
          tabBarIcon: ({ color: c, size }) => <Ionicons name="home" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: t('tabs.properties'),
          tabBarActiveTintColor: TAB_COLOR.properties,
          tabBarIcon: ({ color: c, size }) => <Ionicons name="business" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="card"
        options={{
          title: t('tabs.card'),
          tabBarActiveTintColor: TAB_COLOR.card,
          tabBarIcon: ({ color: c, size }) => <Ionicons name="qr-code" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: t('tabs.network'),
          href: can(profile, 'team') ? undefined : null,
          tabBarActiveTintColor: TAB_COLOR.network,
          tabBarIcon: ({ color: c, size }) => <Ionicons name="people" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tabs.wallet'),
          href: can(profile, 'sell') ? undefined : null,
          tabBarActiveTintColor: TAB_COLOR.wallet,
          tabBarIcon: ({ color: c, size }) => <Ionicons name="wallet" color={c} size={size} />,
        }}
      />
    </Tabs>
  );
}

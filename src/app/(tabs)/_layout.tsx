import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { color } from '@/theme/tokens';
import { useAuth } from '@/stores/auth';

/**
 * Role-aware bottom tabs (SuperPrompt §5: "role-aware bottom tabs").
 * Buyers get a discovery-focused shell; partners (agent and above) also get
 * Network + Wallet. Role comes from the DB profile — never hardcoded (§13).
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const role = useAuth((s) => s.profile?.role_slug);
  const isPartner = role != null && role !== 'buyer';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.red,
        tabBarInactiveTintColor: color.muted,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.line,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color: c, size }) => <Ionicons name="home" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: t('tabs.properties'),
          tabBarIcon: ({ color: c, size }) => <Ionicons name="business" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="card"
        options={{
          title: t('tabs.card'),
          tabBarIcon: ({ color: c, size }) => <Ionicons name="qr-code" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: t('tabs.network'),
          href: isPartner ? undefined : null,
          tabBarIcon: ({ color: c, size }) => <Ionicons name="people" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tabs.wallet'),
          href: isPartner ? undefined : null,
          tabBarIcon: ({ color: c, size }) => <Ionicons name="wallet" color={c} size={size} />,
        }}
      />
    </Tabs>
  );
}

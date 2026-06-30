import '@/global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/query';
import '@/lib/i18n';
import { LockGate } from '@/components/LockGate';
import { NotificationsBridge } from '@/features/notifications/Bridge';
import { useAuth } from '@/stores/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const init = useAuth((s) => s.init);
  const initializing = useAuth((s) => s.initializing);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (fontsLoaded && !initializing) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, initializing]);

  if (!fontsLoaded || initializing) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NotificationsBridge />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#F7F7F5' },
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="property/[id]" />
            <Stack.Screen name="project/[id]" />
            <Stack.Screen name="leads/index" />
            <Stack.Screen name="leads/pipeline" />
            <Stack.Screen name="leads/[id]" />
            <Stack.Screen name="visits/index" />
            <Stack.Screen name="availability" />
            <Stack.Screen name="team/[id]" />
            <Stack.Screen name="recruit" />
            <Stack.Screen name="referrals" />
            <Stack.Screen name="incentives" />
            <Stack.Screen name="performance" />
            <Stack.Screen name="become-partner" />
            <Stack.Screen name="tools/ad-creator" />
            <Stack.Screen name="tools/ai-studio" />
            <Stack.Screen name="tools/ai-assistant" />
            <Stack.Screen name="brochures/index" />
            <Stack.Screen name="brochures/[id]" />
            <Stack.Screen name="compare" />
            <Stack.Screen name="projects" />
            <Stack.Screen name="map" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="payments" />
            <Stack.Screen name="webview" />
            <Stack.Screen name="kyc" />
            <Stack.Screen name="forms/index" />
            <Stack.Screen name="forms/[key]" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="rewards" />
            <Stack.Screen name="settings/index" />
            <Stack.Screen name="settings/notifications" />
            <Stack.Screen name="settings/security" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="support" />
            <Stack.Screen name="media" />
            <Stack.Screen name="submissions" />
            <Stack.Screen name="features" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
          </Stack>
          <LockGate />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

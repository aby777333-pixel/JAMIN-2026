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
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/query';
import { installCrashGuard, reportClientError } from '@/lib/crash';
import { loadPersistedLanguage } from '@/lib/i18n';
import { LockGate } from '@/components/LockGate';
import { RolePreviewBar } from '@/components/RolePreviewBar';
import { NotificationsBridge } from '@/features/notifications/Bridge';
import { useAuth } from '@/stores/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});
installCrashGuard();

/**
 * Root error boundary: a render error anywhere below shows this recoverable
 * screen (and reports the stack to client_errors) instead of closing the app.
 * Plain RN primitives only — custom fonts may not be loaded yet when it shows.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportClientError(error, 'ErrorBoundary', true);
  }, [error]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F7F7F5' }}>
      <RNText style={{ fontSize: 42 }}>🛠️</RNText>
      <RNText style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginTop: 10 }}>
        Something went wrong
      </RNText>
      <RNText style={{ fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginTop: 8, lineHeight: 19 }}>
        {error.message}
        {'\n'}The error was reported to the JAMIN team.
      </RNText>
      <Pressable
        onPress={() => void retry()}
        style={{ marginTop: 18, backgroundColor: '#FD0001', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 }}>
        <RNText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Try again</RNText>
      </Pressable>
    </View>
  );
}

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
    void loadPersistedLanguage();
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
            <Stack.Screen name="visits/scan" />
            <Stack.Screen name="availability" />
            <Stack.Screen name="shortlists/index" />
            <Stack.Screen name="shortlists/[id]" />
            <Stack.Screen name="cobroke/index" />
            <Stack.Screen name="academy/index" />
            <Stack.Screen name="academy/[id]" />
            <Stack.Screen name="loans/index" />
            <Stack.Screen name="documents/index" />
            <Stack.Screen name="agenda/index" />
            <Stack.Screen name="reels/index" />
            <Stack.Screen name="escrow/index" />
            <Stack.Screen name="tools/staging" />
            <Stack.Screen name="team/[id]" />
            <Stack.Screen name="recruit" />
            <Stack.Screen name="referrals" />
            <Stack.Screen name="incentives" />
            <Stack.Screen name="performance" />
            <Stack.Screen name="become-partner" />
            <Stack.Screen name="community" />
            <Stack.Screen name="staff-apply" />
            <Stack.Screen name="ad-chats/index" />
            <Stack.Screen name="ad-chats/[slug]" />
            <Stack.Screen name="ar" />
            <Stack.Screen name="griha-pravesh" />
            <Stack.Screen name="help" />
            <Stack.Screen name="offers" />
            <Stack.Screen name="recent" />
            <Stack.Screen name="requirements" />
            <Stack.Screen name="role" />
            <Stack.Screen name="sell/index" />
            <Stack.Screen name="sell/new" />
            <Stack.Screen name="vastu" />
            <Stack.Screen name="tools/insights" />
            <Stack.Screen name="tools/poster" />
            <Stack.Screen name="tools/ad-creator" />
            <Stack.Screen name="tools/ai-studio" />
            <Stack.Screen name="tools/ai-image" />
            <Stack.Screen name="tools/ai-assistant" />
            <Stack.Screen name="tools/sarvam-chat" />
            <Stack.Screen name="tools/sarvam-voice" />
            <Stack.Screen name="tools/translate" />
            <Stack.Screen name="tools/valuation" />
            <Stack.Screen name="blessing" />
            <Stack.Screen name="nri" />
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
            <Stack.Screen name="settings/language" />
            <Stack.Screen name="settings/notifications" />
            <Stack.Screen name="settings/security" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="role-preview" />
            <Stack.Screen name="support" />
            <Stack.Screen name="media" />
            <Stack.Screen name="my-posts" />
            <Stack.Screen name="submissions" />
            <Stack.Screen name="features" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
          </Stack>
          <LockGate />
          <RolePreviewBar />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

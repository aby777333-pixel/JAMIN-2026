import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { registerPushToken } from './api';

// Foreground notifications still surface a banner.
Notifications.setNotificationHandler({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
});

/**
 * Mounted once in the root layout. While signed in: registers an Expo push token
 * (device only) and subscribes to Realtime so new notifications refresh the feed
 * and pop a local banner immediately (§11).
 */
export function NotificationsBridge() {
  const userId = useAuth((s) => s.session?.user.id);
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      try {
        if (Device.isDevice) {
          const existing = await Notifications.getPermissionsAsync();
          const status =
            existing.status === 'granted'
              ? 'granted'
              : (await Notifications.requestPermissionsAsync()).status;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const projectId = (Constants?.expoConfig as any)?.extra?.eas?.projectId;
          if (status === 'granted' && projectId) {
            const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            await registerPushToken(token, Platform.OS);
          }
        }
      } catch {
        // push is best-effort; in-app Realtime still works
      }

      channel = supabase
        .channel(`notif-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => {
            void qc.invalidateQueries({ queryKey: ['notifications'] });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const n = payload.new as any;
            Notifications.scheduleNotificationAsync({
              content: { title: n.title ?? 'JAMIN', body: n.body ?? '' },
              trigger: null,
            }).catch(() => {});
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return null;
}

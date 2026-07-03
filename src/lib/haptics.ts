import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Tiny tactile cues. Every call is fire-and-forget and swallowed on error so
 * haptics can never break an interaction (web/simulator no-ops).
 */
export function tap() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

export function success() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

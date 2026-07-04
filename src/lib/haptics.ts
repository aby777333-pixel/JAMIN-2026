import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

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

/** Strong attention buzz — new message / notification arrived. */
export function buzz() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  try {
    // Double-pulse pattern so it clearly feels like an alert, not a tap.
    Vibration.vibrate([0, 250, 120, 250]);
  } catch {
    /* haptic already fired */
  }
}

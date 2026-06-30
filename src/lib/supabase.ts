import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from './env';
import type { Database } from '@/types/database';

/**
 * Supabase client for React Native.
 * - Session persisted in AsyncStorage (auth tokens are also mirrored to SecureStore
 *   by the auth store for biometric re-auth, per SuperPrompt §2 secure-store rule).
 * - detectSessionInUrl disabled (no browser redirect on native).
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * React Native token auto-refresh.
 *
 * `autoRefreshToken: true` relies on a JS timer, but RN suspends timers while the
 * app is backgrounded — so after the access token expires (default 1 h) the next
 * requests go out with a stale/expired JWT and Postgres treats them as anonymous.
 * That silently empties RLS-gated reads (Compare/Map, etc.) and makes RPCs fail
 * with "not authenticated". The fix (per Supabase's RN guidance) is to pause the
 * refresh loop in the background and resume — forcing an immediate refresh — on
 * foreground. Guarded so it is a no-op anywhere `AppState` is unavailable.
 */
if (AppState && typeof AppState.addEventListener === 'function') {
  // Kick the refresh loop once at startup so a cold open with an expired token recovers.
  supabase.auth.startAutoRefresh().catch(() => {});
  AppState.addEventListener('change', (status) => {
    if (status === 'active') supabase.auth.startAutoRefresh().catch(() => {});
    else supabase.auth.stopAutoRefresh().catch(() => {});
  });
}

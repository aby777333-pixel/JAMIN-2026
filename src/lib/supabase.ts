import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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

import type { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/domain';

/**
 * Auth/session store (Zustand = local/session/UI state per SuperPrompt §2).
 * Server data (the profile row) is fetched here on session change. The access
 * token is mirrored into SecureStore so biometric re-auth can restore it (§2).
 */
const BIOMETRIC_TOKEN_KEY = 'jamin.session.token';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  /** True once a session exists but the profile has no full_name yet. */
  needsOnboarding: boolean;
  init: () => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,
  needsOnboarding: false,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    await get().setSession(data.session);
    set({ initializing: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      void get().setSession(session);
    });
  },

  setSession: async (session) => {
    set({ session });
    if (session) {
      await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, session.access_token).catch(() => {});
      await get().refreshProfile();
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY).catch(() => {});
      set({ profile: null, needsOnboarding: false });
    }
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    const { data } = await supabase
      .from('profiles')
      .select('*, role:roles(slug, is_admin)')
      .eq('id', session.user.id)
      .maybeSingle();

    const row = data as
      | (Record<string, unknown> & { role?: { slug?: string; is_admin?: boolean } | null })
      | null;
    const profile = row
      ? ({
          ...row,
          role_slug: row.role?.slug ?? null,
          role_is_admin: row.role?.is_admin ?? false,
        } as unknown as Profile)
      : null;
    set({
      profile,
      needsOnboarding: !profile || !profile.full_name,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY).catch(() => {});
    set({ session: null, profile: null, needsOnboarding: false });
  },
}));

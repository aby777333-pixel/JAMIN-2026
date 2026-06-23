import type { Session } from '@supabase/supabase-js';
import * as LocalAuthentication from 'expo-local-authentication';
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
const BIOMETRIC_FLAG_KEY = 'jamin.biometric';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  /** True once a session exists but the profile has no full_name yet. */
  needsOnboarding: boolean;
  /** App-lock: true when a biometric unlock is required before showing content. */
  locked: boolean;
  biometricEnabled: boolean;
  init: () => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  unlock: () => Promise<void>;
  setBiometric: (on: boolean) => Promise<boolean>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,
  needsOnboarding: false,
  locked: false,
  biometricEnabled: false,

  init: async () => {
    const bio = (await SecureStore.getItemAsync(BIOMETRIC_FLAG_KEY).catch(() => null)) === 'on';
    const { data } = await supabase.auth.getSession();
    await get().setSession(data.session);

    let locked = false;
    if (data.session && bio) {
      try {
        locked =
          (await LocalAuthentication.hasHardwareAsync()) &&
          (await LocalAuthentication.isEnrolledAsync());
      } catch {
        locked = false;
      }
    }
    set({ initializing: false, biometricEnabled: bio, locked });

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
      set({ profile: null, needsOnboarding: false, locked: false });
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
    set({ session: null, profile: null, needsOnboarding: false, locked: false });
  },

  unlock: async () => {
    try {
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock JAMIN Properties',
        fallbackLabel: 'Use passcode',
      });
      if (r.success) set({ locked: false });
    } catch {
      /* keep locked; user can retry */
    }
  },

  setBiometric: async (on) => {
    if (on) {
      const hw = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      if (!hw || !enrolled) return false;
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to enable lock' });
      if (!r.success) return false;
    }
    await SecureStore.setItemAsync(BIOMETRIC_FLAG_KEY, on ? 'on' : 'off').catch(() => {});
    set({ biometricEnabled: on });
    return true;
  },
}));

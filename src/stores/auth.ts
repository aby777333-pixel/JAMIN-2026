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
  /** Admin "preview as role": the role slug being previewed (UI-only, never persisted to DB). */
  previewRole: string | null;
  /** The caller's REAL admin status (survives preview so the exit affordance always shows). */
  isRealAdmin: boolean;
  init: () => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  unlock: () => Promise<void>;
  setBiometric: (on: boolean) => Promise<boolean>;
  /** Super-admin only: preview the app as any role (null = exit preview, restore real role). */
  setPreviewRole: (slug: string | null) => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,
  needsOnboarding: false,
  locked: false,
  biometricEnabled: false,
  previewRole: null,
  isRealAdmin: false,

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
      set({ profile: null, needsOnboarding: false, locked: false, previewRole: null, isRealAdmin: false });
    }
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    const { data } = await supabase
      .from('profiles')
      .select('*, role:roles(slug, is_admin, level)')
      .eq('id', session.user.id)
      .maybeSingle();

    const row = data as
      | (Record<string, unknown> & {
          role?: { slug?: string; is_admin?: boolean; level?: number } | null;
        })
      | null;
    let profile = row
      ? ({
          ...row,
          role_slug: row.role?.slug ?? null,
          role_is_admin: row.role?.is_admin ?? false,
          role_level: row.role?.level ?? null,
        } as unknown as Profile)
      : null;
    const isRealAdmin = !!row?.role?.is_admin;

    // Re-apply an active admin preview so a background refresh doesn't drop it.
    const preview = get().previewRole;
    if (profile && preview && isRealAdmin) {
      const { data: r } = await supabase
        .from('roles')
        .select('slug, is_admin, level')
        .eq('slug', preview)
        .maybeSingle();
      const pr = r as { slug?: string; is_admin?: boolean; level?: number } | null;
      if (pr) {
        profile = {
          ...profile,
          role_slug: pr.slug ?? preview,
          role_is_admin: !!pr.is_admin,
          role_level: pr.level ?? null,
        } as Profile;
      }
    }

    set({
      profile,
      isRealAdmin,
      needsOnboarding: !profile || !profile.full_name,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY).catch(() => {});
    set({ session: null, profile: null, needsOnboarding: false, locked: false, previewRole: null, isRealAdmin: false });
  },

  setPreviewRole: async (slug) => {
    // Exit preview → reload the real role from the DB.
    if (!slug) {
      set({ previewRole: null });
      await get().refreshProfile();
      return;
    }
    // Only a real admin may preview; never persisted server-side.
    if (!get().isRealAdmin) return;
    const profile = get().profile;
    if (!profile) return;
    const { data } = await supabase
      .from('roles')
      .select('slug, is_admin, level')
      .eq('slug', slug)
      .maybeSingle();
    const r = data as { slug?: string; is_admin?: boolean; level?: number } | null;
    if (!r) return;
    set({
      previewRole: slug,
      profile: {
        ...profile,
        role_slug: r.slug ?? slug,
        role_is_admin: !!r.is_admin,
        role_level: r.level ?? null,
      } as Profile,
    });
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

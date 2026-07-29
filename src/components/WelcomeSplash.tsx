import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TileGrid, ToolTile } from '@/components/ui/ToolTile';
import { tap } from '@/lib/haptics';
import { useAuth } from '@/stores/auth';
import { category, TAGLINE } from '@/theme/tokens';

const HERO = require('../../assets/images/bg/namaste.jpg');

/** A profile created within this window counts as a brand-new sign-up. */
const NEW_USER_WINDOW_MS = 15 * 60 * 1000;

/**
 * Once per signed-in user per app launch — a tiny session-scoped store so tab
 * remounts don't re-show the greeting; cleared on sign-out so the next login
 * greets again. (Zustand, per the app's state conventions.)
 */
const useWelcomeSeen = create<{ seenFor: string | null; markSeen: (uid: string | null) => void }>(
  (set) => ({
    seenFor: null,
    markSeen: (uid) => set({ seenFor: uid }),
  }),
);
useAuth.subscribe((s) => {
  if (!s.session) useWelcomeSeen.setState({ seenFor: null });
});

/** The 8 primary sections — routes only, identical to the existing tabs/links. */
const SHORTCUTS: {
  icon: keyof typeof Ionicons.glyphMap;
  key: string;
  label: string;
  to: string;
  accent: number;
}[] = [
  { icon: 'business', key: 'properties', label: 'Properties', to: '/(tabs)/properties', accent: category.buy },
  { icon: 'trending-up', key: 'investments', label: 'Investments', to: '/(tabs)/wallet', accent: category.finance },
  { icon: 'notifications', key: 'activity', label: 'Activity', to: '/(tabs)/activity', accent: category.comms },
  { icon: 'person-circle', key: 'account', label: 'Account', to: '/(tabs)/account', accent: category.team },
  { icon: 'calculator', key: 'calculators', label: 'Calculators', to: '/calculators', accent: category.finance },
  { icon: 'map', key: 'projects', label: 'Projects', to: '/projects', accent: category.buy },
  { icon: 'chatbubbles', key: 'community', label: 'Community', to: '/community', accent: category.comms },
  { icon: 'help-buoy', key: 'support', label: 'Support', to: '/support', accent: category.docs },
];

/**
 * Welcome experience (owner brief): full-screen namaste hero + personalised
 * greeting + 8 quick-nav square cards, shown right after sign-in/sign-up.
 * Pure overlay — it renders above the tabs the auth flow already navigated
 * to, so authentication, routing and every workflow behave exactly as before.
 * Dismiss = tap Continue or any shortcut (which then does a normal push).
 */
export function WelcomeSplash() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);
  const needsOnboarding = useAuth((s) => s.needsOnboarding);
  const locked = useAuth((s) => s.locked);

  // useState initializers (not refs) so render never touches a ref value.
  const [fade] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(24));
  const seenFor = useWelcomeSeen((s) => s.seenFor);
  const markSeen = useWelcomeSeen((s) => s.markSeen);

  // Never cover onboarding or the biometric lock; greet once per login.
  // Visibility is fully derived in render; dismissal writes the store.
  const uid = session?.user.id ?? null;
  const ready = !!uid && !!profile && !needsOnboarding && !locked;
  const visible = ready && seenFor !== uid;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(rise, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fade, rise]);

  if (!visible) return null;

  const firstName = (profile?.full_name ?? '').trim().split(/\s+/)[0] || '';
  // "New" = this sign-in happened within minutes of account creation, judged
  // purely from the server's own timestamps (no wall-clock reads in render).
  const createdAt = session?.user.created_at ? new Date(session.user.created_at).getTime() : 0;
  const lastSignIn = session?.user.last_sign_in_at
    ? new Date(session.user.last_sign_in_at).getTime()
    : createdAt;
  const isNew = createdAt > 0 && lastSignIn - createdAt < NEW_USER_WINDOW_MS;
  const heroHeight = Math.min(Dimensions.get('window').height * 0.33, 320);

  function close() {
    markSeen(uid);
  }

  function go(to: string) {
    tap();
    close();
    router.push(to as never);
  }

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={close}>
      <Animated.View className="flex-1 bg-paper" style={{ opacity: fade }}>
        {/* Hero — the namaste artwork on its own canvas, breathing room above
            (owner feedback: sit the illustration slightly lower). */}
        <View
          className="items-center justify-end"
          style={{
            height: heroHeight + insets.top + 24,
            paddingTop: insets.top + 24,
            backgroundColor: '#FFFFFF',
          }}>
          <Image source={HERO} style={{ width: '100%', height: heroHeight }} contentFit="contain" />
        </View>

        {/* Greeting sheet. */}
        <Animated.View
          className="flex-1 rounded-t-3xl bg-surface px-5 pt-6"
          style={{
            transform: [{ translateY: rise }],
            // Sits BELOW the illustration (owner: namaste must be fully
            // visible — no sheet overlap over the praying hands).
            marginTop: 8,
            shadowColor: '#202020',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
            elevation: 8,
          }}>
          {/* Brand mark between the illustration and the greeting. */}
          <View className="items-center pb-3">
            <Logo width={150} />
          </View>
          <Text className="text-center font-medium text-[11px] uppercase tracking-[3px] text-gold-deep">
            {t('welcome.namaste', { defaultValue: 'Namaste' })} 🙏
          </Text>
          <Text variant="h1" className="pt-1 text-center">
            {isNew || !firstName
              ? t('welcome.new', { defaultValue: 'Welcome to Jamin Bazaar' })
              : t('welcome.back', { defaultValue: 'Welcome Back, {{name}}', name: firstName })}
          </Text>
          <Text variant="caption" className="pb-5 pt-1 text-center">
            {TAGLINE}
          </Text>

          <TileGrid>
            {SHORTCUTS.map((s) => (
              <ToolTile
                key={s.key}
                icon={s.icon}
                label={t(`welcome.tiles.${s.key}`, { defaultValue: s.label })}
                accent={s.accent}
                onPress={() => go(s.to)}
              />
            ))}
          </TileGrid>

          <View className="flex-1" />
          <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
            <Button
              title={t('welcome.continue', { defaultValue: 'Continue' })}
              onPress={() => {
                tap();
                close();
              }}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

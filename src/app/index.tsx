import { Redirect } from 'expo-router';

import { useAuth } from '@/stores/auth';

/** Auth gate. Splash stays up (root layout returns null) until init resolves. */
export default function Index() {
  const session = useAuth((s) => s.session);
  const needsOnboarding = useAuth((s) => s.needsOnboarding);

  if (!session) return <Redirect href="/(auth)/login" />;
  if (needsOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

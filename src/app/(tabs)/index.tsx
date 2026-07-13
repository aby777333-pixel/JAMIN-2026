import { Redirect } from 'expo-router';

/**
 * Home retired (simplification brief): Properties is the landing experience.
 * Everything the old Home carried moved into the four tabs — announcements &
 * digest → Activity, referral / KYC / quick links → Account, stats → the
 * Investments and Network screens. Kept as a redirect so '/', '/(tabs)' and
 * every historic push target still resolve.
 */
export default function Index() {
  return <Redirect href="/(tabs)/properties" />;
}

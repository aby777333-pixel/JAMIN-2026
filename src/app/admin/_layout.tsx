import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/stores/auth';

/** Admin Portal (§5.12) — only reachable by roles flagged is_admin. */
export default function AdminLayout() {
  const isAdmin = useAuth((s) => s.profile?.role_is_admin);
  if (!isAdmin) return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F7F5' } }} />
  );
}

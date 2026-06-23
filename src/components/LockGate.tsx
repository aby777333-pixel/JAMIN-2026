import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

/** Full-screen biometric lock shown over everything when the app is locked (§10). */
export function LockGate() {
  const locked = useAuth((s) => s.locked);
  const unlock = useAuth((s) => s.unlock);

  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  if (!locked) return null;
  return (
    <View
      className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center gap-6 bg-paper px-8"
      style={{ zIndex: 100 }}>
      <Logo width={220} showTagline />
      <Text variant="body" className="text-center text-muted">
        Locked for your security
      </Text>
      <View className="w-48">
        <Button
          title="Unlock"
          left={<Ionicons name="finger-print" size={18} color="#FFFFFF" />}
          onPress={() => unlock()}
        />
      </View>
    </View>
  );
}

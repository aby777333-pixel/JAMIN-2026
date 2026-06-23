import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { sendEmailOtp, verifyEmailOtp } from '@/features/auth/api';

export default function Verify() {
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onVerify() {
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t('auth.invalidCode'));
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await verifyEmailOtp(email, code);
      // Auth store picks up the new session; index gate routes onward.
      router.replace('/');
    } catch (e) {
      Alert.alert(t('auth.invalidCode'), e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={false} contentClassName="justify-center gap-8">
      <View className="items-center">
        <Logo width={200} />
      </View>
      <View className="gap-2">
        <Text variant="h1">{t('auth.otpTitle')}</Text>
        <Text variant="body" className="text-muted">
          {t('auth.otpSubtitle', { email })}
        </Text>
      </View>

      <Input
        label={t('auth.otpTitle')}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={onVerify}
        error={error}
        className="text-center font-mono text-[24px] tracking-[8px]"
      />

      <Button title={t('auth.verify')} loading={loading} onPress={onVerify} />

      <Pressable onPress={() => sendEmailOtp(email)} className="self-center py-2">
        <Text className="font-semibold text-red">{t('auth.resend')}</Text>
      </Pressable>
    </Screen>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { completeProfile } from '@/features/auth/api';
import { useAuth } from '@/stores/auth';

export default function Onboarding() {
  const { t } = useTranslation();
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});

  async function onFinish() {
    const next: typeof errors = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name';
    if (!/^[+\d][\d\s-]{7,}$/.test(phone.trim())) next.phone = 'Enter a valid phone number';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await completeProfile({ fullName, phone, referralCode });
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Setup failed', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen contentClassName="py-4">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="items-center py-2">
          <Logo width={180} />
        </View>

        <View className="mt-4 gap-1">
          <Text variant="h1">{t('onboarding.title')}</Text>
          <Text variant="body" className="text-muted">
            {t('onboarding.subtitle')}
          </Text>
        </View>

        <View className="mt-6 gap-4">
          <Input
            label={t('onboarding.fullName')}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            error={errors.fullName}
          />
          <Input
            label={t('onboarding.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            inputMode="tel"
            error={errors.phone}
          />
          <Input
            label={t('onboarding.referralCode')}
            value={referralCode}
            onChangeText={(v) => setReferralCode(v.toUpperCase())}
            autoCapitalize="characters"
          />
          <Button title={t('onboarding.finish')} loading={loading} onPress={onFinish} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
